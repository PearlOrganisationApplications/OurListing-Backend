import Property from "../models/Property.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "secret", {
    expiresIn: "30d",
  });
};

export const register = async (req, res) => {
  const { name, email, password, number, address, role } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    let profilePicUrl = "";
    if (req.file) {

      const protocol = req.protocol;
      const host = req.get('host');
      profilePicUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    }


    const user = await User.create({
      name,
      email,
      password,
      number,
      address,
      role,
      profilePic: profilePicUrl

    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
                profilePic: user.profilePic,

      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        number: user.number,
        address: user.address,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user =await User.findByIdAndDelete(userId);

    if (!user) {
      res.status(400).json({
        success: false,
        message: "User not exist",
      });
    }

    return res.status(200).json({
      success: true,
      message: "delete succesfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


export const updateUserProfile = async (req, res) => {
  try {
    const { name, email, number, address } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check email already exists
    if (email && email !== user.email) {
      const emailExists = await User.findOne({
        email,
        _id: { $ne: user._id },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.number = number || user.number;
    user.address = address || user.address;

    const updatedUser = await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        number: updatedUser.number,
        address: updatedUser.address,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};





export const searchProperties = async (req, res) => {
  try {
    const {
      keyword,
      listingType,
      propertyType,
      minPrice,
      maxPrice,
      location,
      bedroom,
      bathroom,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {
      status: "ACTIVE",
    };

    // Search by title, info, location
    if (keyword) {
      filter.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { info: { $regex: keyword, $options: "i" } },
        { location: { $regex: keyword, $options: "i" } },
      ];
    }

    if (listingType) {
      filter.listingType = listingType;
    }

    if (propertyType) {
      filter.propertyType = propertyType;
    }

    if (location) {
      filter.location = {
        $regex: location,
        $options: "i",
      };
    }

    if (bedroom) {
      filter["features.bedroom"] = { $gte: Number(bedroom) };
    }

    if (bathroom) {
      filter["features.bathroom"] = { $gte: Number(bathroom) };
    }

    if (minPrice || maxPrice) {
      filter.price = {};

      if (minPrice) {
        filter.price.$gte = Number(minPrice);
      }

      if (maxPrice) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    const properties = await Property.find(filter)
      .populate("ownerId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Property.countDocuments(filter);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      searchData: properties,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};