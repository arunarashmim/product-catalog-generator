const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Product = require('./models/Product');

const app = express();
const PORT = 3000;

// ✅ MongoDB Connection (cleaned)
mongoose.connect('mongodb://localhost:27017/productCatalog')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// ✅ Add single product
app.post('/add-product', upload.single('image'), async (req, res) => {
  try {
    const { name, description, specs } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

    const product = new Product({ name, description, specs, imageUrl });
    await product.save();
    res.json({ message: 'Product added' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add product', details: err.message });
  }
});

// ✅ Batch upload via CSV
app.post('/batch-upload', upload.single('csv'), async (req, res) => {
  const results = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        const mapped = results.map(item => ({
          name: item.name,
          description: item.description,
          specs: item.specs,
          imageUrl: `/uploads/${item.imageName}`
        }));

        await Product.insertMany(mapped);
        res.json({ message: 'Batch upload successful' });
      } catch (err) {
        res.status(500).json({ message: 'Batch upload failed', error: err.message });
      }
    });
});

// ✅ Get all products
app.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch products', error: err.message });
  }
});

// ✅ Delete product by ID
app.delete('/delete/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete product', error: err.message });
  }
});

// ✅ Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
