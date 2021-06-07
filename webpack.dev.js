const path = require("path");

const HtmlMinimizerPlugin = require("html-minimizer-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const browserslist = require('browserslist');



module.exports = [
  // Client Build Script
  {
    mode: "development",
    target: "web",
    entry: path.join(__dirname, "src", "client", "js", "index.js"),
    output: {
      path: path.resolve(__dirname, "public"),
      filename: "js/client.bundle.js"
    },
    module: {
      rules: [
        {
          exclude: /node_modules/,
          include: [path.resolve(__dirname, 'src', 'common', 'view')],
          test: /\.pug$/,
          use: ['file-loader?name=[name].html','pug-static-loader']
        },
        {
          exclude: /node_modules/,
          include: [path.resolve(__dirname, "src", "client", "scss")],
          test: /\.s[ac]ss$/,
          use: [
            MiniCssExtractPlugin.loader,
            "css-loader", 
            "resolve-url-loader",
            {
              loader: "sass-loader",
              options: {
                implementation: require("node-sass"),
                sourceMap: true,
              },
            }
          ]
        },
        {
          exclude: /node_modules/,
          include: [path.resolve(__dirname, "src", "server")],
          test: /.ts$/,
          use: [
            "ts-loader",
          ]
        }
      ]
    },
    resolve: {
      extensions: [".json", ".js", ".jsx", ".pug", ".scss"]
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: "./css/style.css"
      })
    ],
    devtool: "source-map",
    devServer: {
      contentBase: path.join(__dirname, "public"),
      compress: true,
      port: 8080,
      hot: true
    }
  },
  // Server Build Script
  {
    mode: "development",
    target: "node",
    entry: path.join(__dirname, "src", "server", "index.ts"),
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "server.js"
    },
    module: {
      rules: [
        {
          exclude: [/node_modules/],
          include: [path.resolve(__dirname, "src", "server")],
          test: /.ts$/,
          use: [
            "ts-loader",
          ]
        }
      ]
    },
    resolve: {
      extensions: [".json", ".ts", ".tsx", ".js", ".jsx"]
    },
    plugins: [
    ],
    // devtool: "source-map"
  }
]
