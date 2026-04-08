const express = require('express');
const cors = require('cors');
const sql = require('./db');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads',
express.static(path.join(__dirname,
'uploads')));

const storage = multer.diskStorage({
     destination: function (req, file,
cb){
         cb(null, 'uploads/');
    },
      filename: function (req, file, cb) {
           cb(null, Date.now() + '_' +
    file.originalname);
        }
});
const upload = multer({ storage });

app.get('/', (req, res) => {
   res.send('server is running');
});

app.listen(4000, () => {
     console.log('server running on port 4000');
});

//upload image replacing firebase storage
app.post('/api/upload',
upload.single('image'), (req, res) => {
      try {
          const file = req.file;

           if (!file) {
             
return res.status(400).json({ error: 'No file uploaded' });
     }

   const imageUrl = 'http://207.180.254.163:4000/uploads /${file.filename}';

      res.json({
           success: true,
           imageUrl: imageUrl
        });
  
    } catch (err) {
       console.error(err);
       res.status(500).json({ error:
     'Upload failed' });
                  }
});