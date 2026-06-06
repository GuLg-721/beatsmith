import { Router, Response } from 'express'
import multer from 'multer'
import path from 'path'
import { nanoid } from 'nanoid'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// 音频文件存储配置
const audioStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${nanoid(10)}${ext}`)
  }
})

// 封面图片存储配置
const coverStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `cover-${nanoid(8)}${ext}`)
  }
})

// 头像文件存储配置
const avatarStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads', 'avatars'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `avatar-${nanoid(8)}${ext}`)
  }
})

const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.ogg', '.flac']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的音频格式'))
    }
  }
})

const uploadCover = multer({
  storage: coverStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的图片格式'))
    }
  }
})

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的图片格式'))
    }
  }
})

// POST /api/upload/audio
router.post('/audio', authMiddleware, (req: AuthRequest, res: Response) => {
  uploadAudio.single('audio')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ message: '文件大小超过 50MB 限制' })
          return
        }
        res.status(400).json({ message: err.message })
        return
      }
      res.status(400).json({ message: err.message })
      return
    }

    if (!req.file) {
      res.status(400).json({ message: '请选择音频文件' })
      return
    }

    res.status(200).json({
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    })
  })
})

// POST /api/upload/cover
router.post('/cover', authMiddleware, (req: AuthRequest, res: Response) => {
  uploadCover.single('cover')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ message: '文件大小超过 5MB 限制' })
          return
        }
        res.status(400).json({ message: err.message })
        return
      }
      res.status(400).json({ message: err.message })
      return
    }

    if (!req.file) {
      res.status(400).json({ message: '请选择图片文件' })
      return
    }

    res.status(200).json({
      filename: req.file.filename
    })
  })
})

// POST /api/upload/avatar
router.post('/avatar', authMiddleware, (req: AuthRequest, res: Response) => {
  uploadAvatar.single('avatar')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ message: '文件大小超过 2MB 限制' })
          return
        }
        res.status(400).json({ message: err.message })
        return
      }
      res.status(400).json({ message: err.message })
      return
    }

    if (!req.file) {
      res.status(400).json({ message: '请选择头像文件' })
      return
    }

    res.status(200).json({
      url: `/uploads/avatars/${req.file.filename}`
    })
  })
})

export default router
