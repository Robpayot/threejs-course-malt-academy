const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const postcssPresetEnv = require('postcss-preset-env')
const ImageminPlugin = require('imagemin-webpack-plugin').default
const cssnano = require('cssnano')

const mode = process.env.NODE_ENV || 'production'

const sourceDir = path.join(__dirname, 'src')
const buildDir = path.join(__dirname, 'build')

const isProd = mode === 'production'
const prodPlugins = [new ImageminPlugin({ test: /\.(jpeg|png|gif|svg)$/i })]

module.exports = {
  mode,
  devtool: 'source-map',
  entry: {
    basic: path.join(sourceDir, 'basic/entry.js'),
    intermediate: path.join(sourceDir, 'intermediate/entry.js'),
    advanced: path.join(sourceDir, 'advanced/entry.js'),
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: isProd ? '[name]/bundle.js' : './[name]/bundle.js',
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          { loader: 'css-loader', options: { importLoaders: 1 } },
          isProd
            ? {
                loader: 'postcss-loader',
                options: {
                  ident: 'postcss',
                  plugins: () => [postcssPresetEnv(), cssnano()],
                },
              }
            : null,
          'sass-loader',
        ].filter(Boolean),
      },
      {
        test: /\.(obj)$/,
        use: [
          {
            loader: 'file-loader',
            options: { name: 'models/[name].[ext]' },
          },
        ],
      },
      {
        test: /\.(eot|ttf|woff|woff2)$/,
        use: [
          {
            loader: 'file-loader',
            options: { name: 'fonts/[name].[ext]' },
          },
        ],
      },
      {
        test: /\.(glsl|vs|fs|vert|frag)$/,
        use: ['webpack-glsl-loader'],
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        use: [
          {
            loader: 'ignore-loader',
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: false,
      template: path.join(sourceDir, 'index.html'),
      filename: path.join(buildDir, 'index.html'),
    }),
    new HtmlWebpackPlugin({
      inject: true,
      chunks: ['basic'],
      title: 'Threejs basic exercice',
      template: path.join(sourceDir, 'basic/views/index.html'),
      filename: path.join(buildDir, 'basic/index.html'),
    }),
    new HtmlWebpackPlugin({
      inject: true,
      chunks: ['intermediate'],
      title: 'Threejs intermediate exercice',
      template: path.join(sourceDir, 'intermediate/views/index.html'),
      filename: path.join(buildDir, 'intermediate/index.html'),
    }),
    new HtmlWebpackPlugin({
      inject: true,
      chunks: ['advanced'],
      title: 'Threejs advanced exercice',
      template: path.join(sourceDir, 'advanced/views/index.html'),
      filename: path.join(buildDir, 'advanced/index.html'),
    }),
    new CopyWebpackPlugin([
      {
        from: path.join(sourceDir, 'basic/img'),
        to: 'basic/img',
      },
    ]),
    new CopyWebpackPlugin([
      {
        from: path.join(sourceDir, 'intermediate/img'),
        to: 'intermediate/img',
      },
    ]),
    new CopyWebpackPlugin([
      {
        from: path.join(sourceDir, 'advanced/img'),
        to: 'advanced/img',
      },
    ]),
    new MiniCssExtractPlugin({
      filename: isProd ? '[name]/[name].[chunkhash].css' : './[name]/[name].css',
      chunkFilename: '[id].css',
      fallback: 'style-loader',
      use: [{ loader: 'css-loader', options: { minimize: isProd } }],
    }),
  ].concat(isProd ? prodPlugins : []),
}
