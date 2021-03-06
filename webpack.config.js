const path = require('path')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: ['./index.js'],
    output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
    },
    optimization: {
        minimizer: [
            // new UglifyJsPlugin({
            //     sourceMap: true,
            // })
        ],
    },
    module: {
        rules: [
            {
                test: /\.m?js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    }
                }
            }
        ]
    },
    devtool: 'source-map',
}
