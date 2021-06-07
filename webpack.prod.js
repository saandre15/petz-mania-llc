const path = require('path');
const HtmlMinimizerPlugin = require("html-minimizer-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  mode: "production",
  entry: path.join(__dirname, "client", "js", "index.js"),
  output: {
    filename: 'js/main.js',
    path: path.resolve(__dirname, 'public'),
  },
  module: {
    rules: [
      {
        exclude: /node_modules/,
        test: /\.pug/,
        use: ['file-loader?name=public/html/[name].html', 'pug-html-loader?exports=false']
      },
      {
        exclude: /node_modules/,
        test: /\.tsx?$/,
        use: [{
          loader: "babel-loader",
          cacheDirectory: true,
          options: {
            presets: ["@babel/preset-env"]
          }
        }, {
          loader: "ts-loader",
          options: {
            configFile: "config/ts/client/tsconfig.prod.json"
          }
        }]
      },
      {
        exclude: /node_modules/,
        test: /\.scss$/,
        use: [MiniCssExtractPlugin.loader, {
          loader: "postcss-loader",
          options: {
            postcssOptions: {
              plugins: [
                "postcss-preset-env", {},
                "postcss-clean", {}
              ]
            }
          }
        }, 
        
        "css-loader", {
          loader: "sass-loader",
          options: {
            implementation: require("node-sass")
          }
        }]
      }
    ]
  },
  resolve: {
    extensions: ["tsx", "ts", "js"]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "css/bundle.css"
    })
  ],
  ts: {
    configFileName: "tsconfig.client.json"
  },
  optimization: {
    minimize: true,
    minimizer: [
      new HtmlMinimizerPlugin({
        test: /\.html/
      })
    ]
  }
}