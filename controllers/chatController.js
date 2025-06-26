import axios from 'axios';

// Adjust this URL to your Python backend endpoint
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL;

export const ask = async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ message: 'Message is required' });
  try {
    const question = message;
    const response = await axios.post(PYTHON_BACKEND_URL, { question });
    const reply = response.data.answer;
    return res.json({ reply: reply});
  } catch (error) {
    return res.status(500).json({ message: error.response?.data?.message || 'Failed to get response from AI backend' });
  }
}; 