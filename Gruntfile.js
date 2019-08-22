module.exports = function (grunt) {

  grunt.loadNpmTasks("grunt-ts");
  grunt.loadNpmTasks('grunt-rollup');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');
  const commonjs = require('rollup-plugin-commonjs');
  const node_resolve = require('rollup-plugin-node-resolve');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    ts: {
      default: {
        tsconfig: './tsconfig.json'
      }
    },
    rollup: {
      options: {
        plugins: [
          node_resolve({
            browser: true,
          }),
          commonjs()
        ],
        onwarn: function (warning) {
          if (warning.code === 'THIS_IS_UNDEFINED') return;
          console.error(warning.message);
        }
      },
      files: {
        'dest':'dist/out/js/main.js',
        'src' : 'dist/compile/main.js',
      },
    },
    copy: {
      main: {
        files: [{
          expand: true,
          cwd: 'src',
          src: ['index.html', 'assets/**'],
          dest: 'dist/out/'
        }]
      }
    },
    watch: {
      scripts: {
        files: ['src/**/*'],
        tasks: ['default'],
        options: {
          livereload: true
        }
      },
    },
    connect: {
      server: {
        options: {
          livereload: true,
          port: 8000,
          hostname: 'localhost',
          base: ['dist/out/']
        }
      }
    }
  });

  grunt.registerTask('default', ['ts', 'rollup', 'copy']);
  grunt.registerTask('serve', ['default', 'connect:server', 'watch:scripts']);

};