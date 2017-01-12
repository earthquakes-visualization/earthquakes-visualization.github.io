var gulp = require('gulp');
var watch = require('gulp-watch');
var babel = require('gulp-babel');
var browserSync = require('browser-sync').create();
var watchify = require('watchify');
var browserify = require('browserify');
var assign = require('lodash.assign');
var gutil = require('gulp-util');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');

gulp.task('default', ['babel', 'copy', 'bundle']);

gulp.task('copy', function () {
  return gulp.src('src/*.{html,css,csv,json}')
    .pipe(gulp.dest('./dist/'))
});

gulp.task('babel', function () {
  return gulp.src('src/app.js')
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(gulp.dest('./dist/'))
        .pipe(browserSync.stream());
});



gulp.task('watch', ['babel', 'copy', 'browser-sync', 'bundle'], function () {
  gulp.watch('./src/*.js', ['babel', 'bundle']).on('change', function () {
    browserSync.reload()
  });
  gulp.watch(['./src/*.html', './src/*.css'], ['copy']).on('change', function () {
    browserSync.reload()
  });
})

gulp.task('browser-sync', function () {
  browserSync.init({
    server: {
      baseDir: "./dist/"
    }
  })
});


// add custom browserify options here
var customOpts = {
  entries: ['./src/app.js'],
  debug: true
};
var opts = assign({}, watchify.args, customOpts);
var b = watchify(browserify(opts)); 

function bundle() {
  return b.bundle()
    // log errors if they happen
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source('app.js'))
    // optional, remove if you don't need to buffer file contents
    .pipe(buffer())
    .pipe(gulp.dest('./dist'))
    .pipe(browserSync.stream());
}

gulp.task('bundle', bundle);