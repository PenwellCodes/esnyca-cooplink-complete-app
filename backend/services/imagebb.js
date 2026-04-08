const axios = require('axios');
const FormData = require('form-data');

async function uploadBufferToImageBB(buffer, fileName = 'upload.jpg') {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    throw new Error('IMGBB_API_KEY is not configured');
  }

  const formData = new FormData();
  formData.append('image', buffer.toString('base64'));
  formData.append('name', fileName);

  const response = await axios.post(
    `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
    formData,
    { headers: formData.getHeaders(), maxBodyLength: Infinity },
  );

  if (!response.data?.success || !response.data?.data?.url) {
    throw new Error('ImageBB upload failed');
  }

  return response.data.data.url;
}

module.exports = { uploadBufferToImageBB };

