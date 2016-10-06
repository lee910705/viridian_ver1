var gulp = require('gulp'),
    //less = require('gulp-less'),
    //ngHtml2Js = require('gulp-ng-html2js'),
    //jshint = require('gulp-jshint'),
    //concat = require('gulp-concat'),
    //uglify = require('gulp-uglify'),
    karma = require('karma').server;

var APP = './app/';
var BUILD = './build/';
var UGLIFY = false;

var paths = {
    templates: [SRC + '**/*.html', '!' + SRC + '*.html'],
    //less: [
    //    SRC + 'common-less/common.less',
    //    SRC + 'common-less/hotkeys.css',
    //    SRC + 'common-less/textAngular.css',
        //SRC + 'user/**/*.less'
    //],

    scripts: [
        APP + '**/*.js',
        SRC + '**/*.js',
        '!' + APP + 'lib/**/*.js',
        '!' + APP + '**/*_mock.js',
        '!' + APP + '**/*_test.js'
    ],
    lib: {
        js: [
            SRC + 'lib/js/angular-1.3.15.js',
            //SRC + 'lib/js/angular-sanitize-1.3.15.js',
            SRC + 'lib/js/angular-aria-1.3.15.js',
            SRC + 'lib/js/angular-ui-router-0.2.10.js',
            SRC + 'lib/js/angularfire-1.1.0.js',
            SRC + 'lib/js/ui-bootstrap-tpls-0.13.0.js',
            SRC + 'lib/js/angular-ui-tree-2.1.5-fix.js',
            SRC + 'lib/js/angular.embedly.js',
            SRC + 'lib/js/angular-youtube-embed.js',
            SRC + 'lib/js/angularfire-1.1.0.js',
            SRC + 'lib/js/hotkeys.js',
            SRC + 'lib/js/ng-file-upload.js',
            SRC + 'lib/js/jszip.min.js',
            SRC + 'lib/js/textAngular-rangy.min.js',
            SRC + 'lib/js/textAngular-sanitize.min.js',
            SRC + 'lib/js/textAngular.min.js',
            //SRC + 'lib/js/draganddrop.js',
            SRC + 'lib/js/angular-dragdrop.min.js'
        ],
        d3: [
            SRC + 'lib/js/d3.js'
        ]
    },
    fonts: SRC + 'fonts/**/*',
    awesomefont: SRC + 'font-awesome/**/*',
    favicon: SRC + 'favicon/**/*'
};

gulp.task('build-testbed-init', function() {
    'use strict';
    UGLIFY = false;
    BUILD = './build/testbed/';
    return gulp.src(SRC + 'config/testbed/firebase.json')
        .pipe(gulp.dest(BUILD));
});

gulp.task('build-dev-init', function() {
    'use strict';
    UGLIFY = false;
    BUILD = './build/dev/';
    return gulp.src(SRC + 'config/dev/firebase.json')
        .pipe(gulp.dest(BUILD));
});

gulp.task('build-staging-init', function() {
    'use strict';
    UGLIFY = false;
    BUILD = './build/staging/';
    return gulp.src(SRC + 'config/staging/firebase.json')
        .pipe(gulp.dest(BUILD));
});

gulp.task('build-prod-init', function() {
    'use strict';
    UGLIFY = true;
    BUILD = './build/prod/';
    return gulp.src(SRC + 'config/prod/firebase.json')
        .pipe(gulp.dest(BUILD));
});

gulp.task('build-exec-init', function() {
    'use strict';
    UGLIFY = true;
    BUILD = './build/exec/';
    return gulp.src(SRC + 'config/exec/firebase.json')
        .pipe(gulp.dest(BUILD));
});

gulp.task('security-rules', function() {
    'use strict';
    return gulp.src(SRC + 'config/security-rules.json')
        .pipe(gulp.dest(BUILD + 'config/'));
});

gulp.task('index', function() {
    'use strict';
    return gulp.src(SRC + 'index.html')
        .pipe(gulp.dest(BUILD));
});

gulp.task('templates', function() {
    'use strict';
    return gulp.src(paths.templates)
        .pipe(ngHtml2Js({
            moduleName: 'fireflow.templates'
        }))
        .pipe(concat('templates.js'))
        .pipe(uglify())
        .pipe(gulp.dest(BUILD));
});

gulp.task('less', function() {
    'use strict';
    return gulp.src(paths.less)
        .pipe(less())
        .pipe(concat('fireflow.css'))
        .pipe(gulp.dest(BUILD));
});

gulp.task('lint', function() {
    'use strict';
    return gulp.src(paths.scripts)
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('lib', ['lib-js', 'lib-d3']);

gulp.task('lib-js', function() {
    'use strict';
    return gulp.src(paths.lib.js)
        .pipe(uglify())
        .pipe(concat('lib.min.js'))
        .pipe(gulp.dest(BUILD));
});

gulp.task('lib-d3', function() {
    'use strict';
    return gulp.src(paths.lib.d3)
        .pipe(gulp.dest(BUILD));
});

gulp.task('favicon', function() {
    'use strict';
    return gulp.src(paths.favicon)
        .pipe(gulp.dest(BUILD + '/favicon'));
});

gulp.task('fonts', function() {
    'use strict';
    return gulp.src(paths.fonts)
        .pipe(gulp.dest(BUILD + '/fonts'));
});

gulp.task('awesomefont', function() {
    'use strict';
    return gulp.src(paths.awesomefont)
        .pipe(gulp.dest(BUILD + '/font-awesome'));
});

gulp.task('webserver', function() {
    'use strict';
    gulp.src('builds/dev/')
        .pipe(webserver({
            livereload: true,
            open: true
        }));
});

gulp.task('scripts', ['lint'], function() {
    'use strict';
    var stream = gulp.src(paths.scripts)
        .pipe(concat('fireflow.js'));
    if (UGLIFY) {
        stream.pipe(uglify());
    }
    return stream.pipe(gulp.dest(BUILD));
});

gulp.task('build-dev', ['build-dev-init', 'security-rules', 'index', 'fonts', 'awesomefont', 'favicon', 'lib', 'scripts', 'templates', 'less']);

gulp.task('build-staging', ['build-staging-init', 'security-rules', 'index', 'fonts', 'awesomefont', 'favicon', 'lib', 'scripts', 'templates', 'less']);

gulp.task('build-prod', ['build-prod-init', 'security-rules', 'index', 'fonts', 'awesomefont', 'favicon', 'lib', 'scripts', 'templates', 'less']);

gulp.task('build-exec', ['build-exec-init', 'security-rules', 'index', 'fonts', 'awesomefont', 'favicon', 'lib', 'scripts', 'templates', 'less']);

gulp.task('build-testbed', ['build-testbed-init', 'security-rules', 'index', 'fonts', 'awesomefont', 'favicon', 'lib', 'scripts', 'templates', 'less']);

gulp.task('watch', ['build-dev'], function() {
    'use strict';
    gulp.watch(paths.scripts, ['scripts']);
    gulp.watch(paths.templates, ['templates']);
    gulp.watch([SRC + '**/*.less'], ['less']);
});

gulp.task('test', ['build-dev'], function(done) {
    'use strict';
    karma.start({
        configFile: __dirname + '/karma.conf.js',
        singleRun: false
            //    singleRun: true
    }, done);
});