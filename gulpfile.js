var gulp = require('gulp');
var watch = require('gulp-watch');
var babel = require('gulp-babel');
var browserSync = require('browser-sync').create();

gulp.task('default', ['babel', 'copy']);

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

gulp.task('watch', ['babel', 'copy', 'browser-sync'], function () {
  gulp.watch('./src/*.js', ['babel']).on('change', function () {
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