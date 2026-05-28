const hashtagService = require('../services/hashtagService');

const createHashtag = async (req, res) => {
  try {
    const hashtag = await hashtagService.createHashtag(req.body, req.user.user_id);
    res.status(201).json({ message: 'Tạo hashtag thành công', hashtag });
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
  }
};

const updateHashtag = async (req, res) => {
  try {
    const hashtag = await hashtagService.updateHashtag(req.params.hashtag_id, req.body, req.user.user_id);
    res.status(200).json({ message: 'Sửa hashtag thành công', hashtag });
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
  }
};

const deleteHashtag = async (req, res) => {
  try {
    const result = await hashtagService.deleteHashtag(req.params.hashtag_id, req.user.user_id, req.body || {});
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
  }
};

const getAllHashtags = async (req, res) => {
  try {
    const hashtags = await hashtagService.getAllHashtags();
    res.status(200).json({ hashtags });
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message, code: error.code || undefined });
  }
};

module.exports = { createHashtag, updateHashtag, deleteHashtag, getAllHashtags };
