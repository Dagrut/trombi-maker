const ejs = require('ejs');
const csv = require('csv');
const async = require('async');
const fs = require('fs');
const child_process = require('child_process');

function crash(e) {
	console.error(e);
	process.exit(1);
}

function main() {
	async.parallel(
		[
			function(next) {
				fs.readFile('tpl/content.xml.tpl', 'utf8', function(err, data) {
					next(err, data);
				});
			},
			function(next) {
				fs.readFile('sample_list.csv', 'utf8', function(err, data) {
					next(err, data);
				});
			},
		],
		function(err, data) {
			if(err)
				crash(err);
			var xmltpl = data[0];
			var csvstr = data[1];
			
			csv.parse(csvstr, function(err, csvarr) {
				if(err)
					crash(err);
				
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
				
				var rendered = ejs.render(xmltpl, { db: csvobjs });
				fs.writeFile('tpl/out/content.xml', rendered, function(err) {
					if(err)
						crash(err);
					
					var proc = child_process.spawn('bash');
					proc.stdout.resume();
					proc.stderr.resume();
					proc.stdin.end('cd tpl/out; zip -r ../final.odt *');
				});
			})
		}
	);
}

main();
