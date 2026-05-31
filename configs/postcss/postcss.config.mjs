/** PostCSS config for QMF packages */
export default {
  plugins: {
    'postcss-import': {},
    'postcss-nesting': {},
    'cssnano': process.env.NODE_ENV === 'production' ? { preset: 'default' } : false,
  },
};
