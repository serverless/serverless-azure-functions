const presets = [
  [
    '@babel/env',
    {
      targets: {
        node: '8.0.0'
      },
      useBuiltIns: 'usage',
    },
  ],
];

module.exports = { presets };