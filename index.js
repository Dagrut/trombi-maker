const ejs = require('ejs');
const csv = require('csv');
const async = require('async');
const fs = require('fs');
const child_process = require('child_process');

const tmpdir = './tmp';

function crash(e) {
	console.error(e);
	process.exit(1);
}

function cleanReset(cb) {
	process.chdir(__dirname);
	var cmds = [
		'set -e',
		'touch '+tmpdir,
		'rm -r '+tmpdir,
		'unzip -d '+tmpdir+' data/template.odt',
	];
	var proc = child_process.spawn('bash');
	proc.stdout.resume();
	proc.stderr.resume();
	proc.end(cmds.join('\n'));
	proc.on('end', function(code, signal) {
		cb();
	});
}

function readDataFiles(csvpath, xmlpath, cb) {
	async.parallel(
		[
			function(next) {
				fs.readFile(xmlpath, 'utf8', function(err, data) {
					next(err, data);
				});
			},
			function(next) {
				fs.readFile(csvpath, 'utf8', function(err, data) {
					next(err, data);
				});
			},
		],
		function(err, data) {
			if(err)
				return cb(err);
			var xmlstr = data[0];
			var csvstr = data[1];
			cb(null, xmlstr, csvstr);
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
			if(a[0] < b[0])
				return(-1);
			if(a[0] > b[0])
				return(1);
			return(0);
		});
		
		function curPush() {
			if(curLetterList.length > 0) {
				csvobjs.push({
					letter: curLetter,
					users: curLetterList,
				});
				curLetterList = [];
			}
		}
		
		var csvobjs = [];
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
		
		cb(null, group, year, csvobjs);
	}
}

function renderTpl(group, year, users, cb) {
	var rendered = ejs.render(xmltpl, {
		group: group,
		year: year,
		db: csvobjs,
	});
	
	fs.writeFile(tmpdir+'/content.xml', rendered, function(err) {
		if(err)
			return(cb(err));
		
		var proc = child_process.spawn('bash');
		proc.stdout.resume();
		proc.stderr.resume();
		proc.stdin.end('cd '+tmpdir+'; zip -r ../trombinoscope.odt *; cd ..; rm -r '+tmpdir+'; libreoffice --convert-to pdf trombinoscope.odt');
		proc.on('close', function() {
			cb();
		});
	});
}

function main(csvfile, photodir) {
	var shared = {};
	
	async.serial(
		[
			cleanReset,
			function(next) {
				readDataFiles(csvfile, 'data/content.xml.tpl', function(err, csvstr, xmlstr) {
					if(err)
						return next(err);
					shared.csvstr = csvstr;
					shared.xmlstr = xmlstr;
					next();
				});
			},
			function(next) {
				parseCsv(shared.csvstr, function(err, group, year, people) {
					if(err)
						return next(err);
					
					renderTpl(group, year, people, function(err) {
						if(err)
							return next(err);
						console.log('Done!')
					});
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
