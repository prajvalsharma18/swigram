require('dotenv').config();
const app = require('./src/app.js');

// Connect to DB
require('./src/config/db.js');  

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});