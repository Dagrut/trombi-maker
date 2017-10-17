const ejs = require('ejs');
const csv = require('csv');
const async = require('async');
const fs = require('fs');
const child_process = require('child_process');

const tmpdir = './tmp';

function randToken() {
	var allowedChars = 'abcdefghijklmnopqrstuvwxyz';
	var ret = '';
	for(var i = 0 ; i < 30 ; i++) {
		var id = (Math.random() * allowedChars.length) | 0;
		ret += allowedChars[id];
	}
	return(ret);
}

function crash(e) {
	console.error(e);
	process.exit(1);
}

function getMimeOf(img) {
	var hash = {
		'gif': 'image/gif', 'ief': 'image/ief', 'jp2': 'image/jp2', 'jpg2': 'image/jp2', 'jpeg': 'image/jpeg', 'jpg': 'image/jpeg', 'jpe': 'image/jpeg', 'jpm': 'image/jpm', 'jpx': 'image/jpx', 'jpf': 'image/jpx', 'pcx': 'image/pcx', 'png': 'image/png', 'svg': 'image/svg+xml', 'svgz': 'image/svg+xml', 'tiff': 'image/tiff', 'tif': 'image/tiff', 'djvu': 'image/vnd.djvu', 'djv': 'image/vnd.djvu', 'ico': 'image/vnd.microsoft.icon', 'wbmp': 'image/vnd.wap.wbmp', 'cr2': 'image/x-canon-cr2', 'crw': 'image/x-canon-crw', 'ras': 'image/x-cmu-raster', 'cdr': 'image/x-coreldraw', 'pat': 'image/x-coreldrawpattern', 'cdt': 'image/x-coreldrawtemplate', 'cpt': 'image/x-corelphotopaint', 'erf': 'image/x-epson-erf', 'art': 'image/x-jg', 'jng': 'image/x-jng', 'bmp': 'image/x-ms-bmp', 'nef': 'image/x-nikon-nef', 'orf': 'image/x-olympus-orf', 'psd': 'image/x-photoshop', 'pnm': 'image/x-portable-anymap', 'pbm': 'image/x-portable-bitmap', 'pgm': 'image/x-portable-graymap', 'ppm': 'image/x-portable-pixmap', 'rgb': 'image/x-rgb', 'xbm': 'image/x-xbitmap', 'xpm': 'image/x-xpixmap', 'xwd': 'image/x-xwindowdump',
	};
	
	var ext = img.match(/\.([^.]+)$/);
	ext = ext && ext[1] ? ext[1] : false;
	if(!ext)
		return('image/x-ms-bmp');
	else
		return(hash[ext]);
}

function cleanReset(photodir, cb) {
	process.chdir(__dirname);
	var cmds = [
		'set -e',
		'touch '+tmpdir,
		'rm -r '+tmpdir,
		'rm -f trombinoscope.odt trombinoscope.pdf',
		'unzip -d '+tmpdir+' data/template.odt',
		'orig=$PWD',
		'cd '+tmpdir,
		'cd Pictures',
		'odtpicdir=$PWD',
		'cd "$orig"',
		'photosrcdir=$(base64 -d <<<'+new Buffer(photodir, 'utf8').toString('base64')+')',
		'cd "$photosrcdir"',
		'IFS=$\'\n\'',
		'for i in $(ls -1); do convert "$i" -resize 256x256 "$odtpicdir/$i"; done',
	];
	var proc = child_process.spawn('bash');
	proc.stdout.resume();
	proc.stderr.resume();
	proc.stdin.end(cmds.join('\n'));
	proc.on('close', function(code, signal) {
		cb(code);
	});
}

function finalClean(cb) {
	var cmds = [
		'set -e',
		'rm -r '+tmpdir,
	];
	var proc = child_process.spawn('bash');
	proc.stdout.resume();
	proc.stderr.resume();
	proc.stdin.end(cmds.join('\n'));
	proc.on('close', function(code, signal) {
		cb(code);
	});
}

function readDataFiles(csvpath, cb) {
	async.parallel(
		[
			function(next) {
				fs.readFile(csvpath, 'utf8', function(err, data) {
					next(err, data);
				});
			},
			function(next) {
				fs.readFile('data/content.xml.tpl', 'utf8', function(err, data) {
					next(err, data);
				});
			},
			function(next) {
				fs.readFile('data/manifest.xml.tpl', 'utf8', function(err, data) {
					next(err, data);
				});
			},
		],
		function(err, data) {
			if(err)
				return cb(err);
			var csvstr = data[0];
			var xmlstr = data[1];
			var manifeststr = data[2];
			cb(null, csvstr, xmlstr, manifeststr);
		}
	);
}

function parseCsv(csvstr, cb) {
	csv.parse(csvstr, function(err, csvarr) {
		if(err)
			return cb(err);
		
		var group = csvarr.shift()[1];
		var year = csvarr.shift()[1];
		csvarr.shift();
		csvarr.sort(function(a, b) {
			if(a[1] < b[1])
				return(-1);
			if(a[1] > b[1])
				return(1);
			if(a[2] < b[2])
				return(-1);
			if(a[2] > b[2])
				return(1);
			return(0);
		});
		
		var csvImages = [];
		var hasImg = {};
		for(var i = 0 ; i < csvarr.length ; i++) {
			var img = csvarr[i][0].trim();
			if(!img)
				continue;
			if(hasImg[img])
				continue;
			hasImg[img] = true;
			csvImages.push({
				name: img,
				mime: getMimeOf(img)
			});
		}
		
		function curPush() {
			if(curLetterList.length > 0) {
				csvUsersFinal.push({
					letter: curLetter,
					users: curLetterList,
				});
				curLetterList = [];
			}
		}
		
		var csvUsersFinal = [];
		var curLetter = null;
		var curLetterList = [];
		for(var i = 0 ; i < csvarr.length ; i++) {
			if(csvarr[i][1][0] != curLetter) {
				curPush();
				curLetter = csvarr[i][1][0];
			}
			
			curLetterList.push({
				picture: csvarr[i][0],
				lastname: csvarr[i][1],
				firstname: csvarr[i][2],
				landline: csvarr[i][3],
				gsm: csvarr[i][4],
				email: csvarr[i][5],
				town: csvarr[i][6],
				voice: csvarr[i][7],
			});
		}
		
		curPush();
		
		cb(null, group, year, csvUsersFinal, csvImages);
	});
}

function renderContent(xmltpl, group, year, users, cb) {
	var rendered = ejs.render(xmltpl, {
		group: group,
		year: year,
		db: users,
		rndtok: randToken,
		zindex: (function() {
			var i = 0;
			return(function() {
				var ret = i;
				i++;
				return(ret);
			});
		})(),
	});
	
	fs.writeFile(tmpdir+'/content.xml', rendered, function(err) {
		if(err)
			return(cb(err));
		
		cb();
	});
}

function renderManifest(xmltpl, images, cb) {
	var rendered = ejs.render(xmltpl, {
		images: images,
	});
	
	fs.writeFile(tmpdir+'/META-INF/manifest.xml', rendered, function(err) {
		if(err)
			return(cb(err));
		
		cb();
	});
}

function generateOdtPdf(cb) {
	var proc = child_process.spawn('bash');
	proc.stdout.resume();
	proc.stderr.resume();
	proc.stdin.end(
		[
			'set -e',
			'base=$PWD',
			'cd '+tmpdir,
			'zip -r "$base/trombinoscope.odt" *',
			'cd "$base"',
			'libreoffice --convert-to pdf trombinoscope.odt',
		].join('\n')
	);
	
	proc.on('close', function() {
		cb();
	});
}

function main(csvfile, photodir) {
	var contentxmltpl = '';
	var manifestxmltpl = '';
	
	async.waterfall(
		[
			function(next) {
				cleanReset(photodir, function(code) {
					if(code != 0)
						next(new Error('Shell code return not zero! (cleanReset)'));
					else
						next();
				});
			},
			function(next) {
				readDataFiles(csvfile, function(err, csvstr, xmlstr, manifeststr) {
					contentxmltpl = xmlstr;
					manifestxmltpl = manifeststr;
					next(err, csvstr);
				});
			},
			function(csvstr, next) {
				parseCsv(csvstr, next);
			},
			function(group, year, people, images, next) {
				async.parallel(
					[
						function(next) {
							renderContent(contentxmltpl, group, year, people, function(err) {
								next(err);
							});
						},
						function(next) {
							renderManifest(manifestxmltpl, images, function(err) {
								next(err);
							});
						},
					],
					function(err, data) {
						next(err);
					}
				);
			},
			function(next) {
				generateOdtPdf(next);
			},
			function(next) {
				finalClean(function(code) {
					if(code != 0)
						next(new Error('Shell code return not zero! (finalClean)'));
					else
						next();
				});
			},
		],
		function(err) {
			if(err)
				return crash(err);
		}
	);
}

if(process.argv.length < 4) {
	console.log('Usage : '+process.argv[1]+' <csvfile> <photodir>');
	process.exit(1);
}

main(process.argv[2], process.argv[3]);
