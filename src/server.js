// DB CONNECTION + CONFIG + .ENV + SERVER START ALL WILL BE DONE HERE

const app = require('./src/app.js');




const PORT = 3000;

app.listen( PORT , () => {
    console.log(`Server is running on port ${PORT}`);
});