const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');
const fs = require('fs');

// App directory
const appDirectory = fs.realpathSync(process.cwd());
 
module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        server: "https",
        static: path.resolve(appDirectory, "public"),
        compress: true,
        hot: true,
        // publicPath: '/',
        open: true,
        // host: '0.0.0.0', // enable to access from other devices on the network
        // https: true // enable when HTTPS is needed (like in WebXR)
        headers: {
            "Access-Control-Allow-Origin": "*", 
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization", 
          }
    },
});