import JSZip from 'jszip';
import './Blob.js';
import saveAs from './FileSaver.js';

export const Excel = {
	generate: function (Planning) {
		const check = _.chain(Planning.eventsThisMonth())
			.filter(function (evt) {return evt.tag === 'vol'})
			.every(function (evt) {return _.contains(['opl', 'cdb', 'officier pilote de ligne', 'commandant de bord'], evt.fonction.toLowerCase()) || !_.has(evt, 'fonction')})
			.value();
		Meteor.call('xlsx', check, function (error, data) {
			const zip = new JSZip(data, { base64: false });			

			function xmlToString(xmlData) {
				//IE
				if (window.ActiveXObject) {
					return xmlData.xml;
				}
				// code for Mozilla, Firefox, Opera, etc.
				else {
					return (new XMLSerializer()).serializeToString(xmlData);
				}
			}

			const epoch = moment('1904-01-01');
			
			function datenum(m) {
				return m.diff(epoch, 'days');
			}

			function hnum(m) {
				if (!m._isAMomentObject) m = moment(m);
				return (m.get('hours') + m.get('minutes')/60)/24;
			}

			function real(obj, key) {
				return obj.real ? obj.real[key] : obj[key];
			}

			var wbxml = $.parseXML(zip.file('xl/workbook.xml').asText());
			var $wb = $(wbxml);
			$wb.find('calcPr')
				.attr('fullCalcOnLoad', "1")
				.attr('forceFullCalc', "1")
				.attr('calcMode', "auto");
			// $wb.find('workbookView').attr('activeTab', "0");
			zip.file('xl/workbook.xml', xmlToString(wbxml));

			var sstxml = $.parseXML(zip.file('xl/sharedStrings.xml').asText());
			var $sst = $(sstxml).find('sst');
			
			var SharedStrings = {
				data: [],
				lookup: function (str) {
					var f = _.find(this.data, function (item, index) {
						return item.str === str;
					});

					if (f) return f.index;

					return this.add(str);
				},
				add: function (str) {
					$sst.append('<si><t>' + str + '</t></si>');
					return this.register(str);
				},
				register: function (str) {
					var index = this.data.length;
					this.data.push({
						str: str,
						index: index
					});
					return index;
				},
				save: function () {
					var uniq = _.uniq(this.data, false, function (item) {
						return item.str;
					});
					$sst.attr('count', this.data.length).attr('uniqueCount', uniq.length);
					zip.file('xl/sharedStrings.xml', xmlToString(sstxml));
				}
			};

			$sst.find('si').each(function (index, el) {
				SharedStrings.register($(el).text());
			});

			var wsxml = $.parseXML(zip.file('xl/worksheets/sheet1.xml').asText());
			var $ws = $(wsxml);
			let row = 2,
				$row;

			const currentData = Planning.groupedEventsThisMonth();

			console.log(currentData);

			_.forEach(currentData.rotations, function (rot) {
				$row = $ws.find('row[r='+row+']');

				$row.find('c[r=B'+row+']')
					.append('<v>' + rot.nbjours + '</v>');

				_.forEach(rot.sv, function (sv) {
					// Date
					$row.find('c[r=A'+row+']')
						.append('<v>'+ datenum(sv.tsStart) +'</v>');

					_.forEach(sv.events, function (evt, i) {
						if (i) $row = $ws.find('row[r='+(row+i)+']');
						
						// Code IATA origine
						$row.find('c[r=C'+(row+i)+']')
							.attr('t', 's')
							.append('<v>' + SharedStrings.lookup(evt.from) + '</v>');

						// Code IATA destination
						$row.find('c[r=D'+(row+i)+']')
							.attr('t', 's')
							.append('<v>' + SharedStrings.lookup(evt.to) + '</v>');

						// Type : (string) "Vol", "Mep", "Sol", "Déleg."
						$row.find('c[r=E'+(row+i)+']')
							.attr('t', 's')
							.append('<v>' +SharedStrings.lookup(evt.tag === 'vol' ? 'Vol' : 'Mep') + '</v>');

						// Heure départ programmée
						$row.find('c[r=F'+(row+i)+']')
							.removeAttr('t')
							.find('v,is').remove().end()
							.append('<v>' + hnum(evt.start) + '</v>');

						// Heure départ réalisée
						$row.find('c[r=H'+(row+i)+']')
							.removeAttr('t')
							.find('v,is').remove().end()
							.append('<v>' + hnum(real(evt, 'start')) + '</v>');

						// Heure arrivée programmée
						$row.find('c[r=G'+(row+i)+']')
							.removeAttr('t')
							.find('v,is').remove().end()
							.append('<v>' + hnum(evt.end) + '</v>');

						// Heure arrivée réalisée
						$row.find('c[r=I'+(row+i)+']')
							.removeAttr('t')
							.find('v,is').remove().end()
							.append('<v>' + hnum(real(evt, 'end')) + '</v>');

						switch (evt.tag) {
							case 'vol':
								// HV100%
								$row.find('c[r=J'+(row+i)+']')
									.removeAttr('t')
									.find('v')
									.text(evt['HV100%']);
								// Temps de vol cale à cale réalisé
								$row.find('c[r=K'+(row+i)+']')
									.removeAttr('t')
									.find('v')
									.text(real(evt, 'tv'));
								// Heures de nuit programées
								$row.find('c[r=P'+(row+i)+']')
									.removeAttr('t')
									.find('v')
									.text(evt.hdn);
								// Heures de nuit réalisées
								$row.find('c[r=Q'+(row+i)+'],c[r=R'+(row+i)+']')
									.removeAttr('t')
									.find('v')
									.text(real(evt, 'hdn'));
								// HC nuit
								$row.find('c[r=S'+(row+i)+']')
									.removeAttr('t')
									.find('v')
									.text(real(evt, 'Hcn')/5);
								break;
							case 'mep':
								// Temps mise en place
								$row.find('c[r=L'+(row+i)+']')
									.removeAttr('t')
									.find('v')
									.text(evt.tv);
								break;
						}
						
					});
					
					row += 4;
					$row = $ws.find('row[r='+row+']');

					// TME
					$row.find('c[r=T'+row+']')
						.removeAttr('t')
						.find('v')
						.text(real(sv, 'tme'));

					// CMT
					$row.find('c[r=U'+row+']')
						.removeAttr('t')
						.find('v')
						.text(real(sv, 'cmt'));

					// Premier block
					$row.find('c[r=V'+row+']')
						.removeAttr('t')
						.find('v')
						.text(hnum(Math.min(real(_.first(sv.events), 'start'), _.first(sv.events).start)));
					
					// Dernier block
					$row.find('c[r=W'+row+']')
						.removeAttr('t')
						.find('v')
						.text(hnum(real(sv, 'tsvEnd')));

					// Temps Rémunéré (TR)
					$row.find('c[r=X'+row+']')
						.removeAttr('t')
						.find('v')
						.text(real(sv, 'TR'));

					// Hcv
					$row.find('c[r=Y'+row+']')
						.removeAttr('t')
						.find('v')
						.text(real(sv, 'Hcv'));

					// Hct
					$row.find('c[r=Z'+row+']')
						.removeAttr('t')
						.find('v')
						.text(real(sv, 'Hct'));

					// H1
					$row.find('c[r=AA'+row+']')
						.removeAttr('t')
						.find('v')
						.text(real(sv, 'H1'));

					// Début TS
					$row.find('c[r=AE'+row+']')
						.removeAttr('t')
						.find('v')
						.text(hnum(sv.tsStart));

					// Fin TS
					$row.find('c[r=AF'+row+']')
						.removeAttr('t')
						.find('v')
						.text(hnum(real(sv, 'tsEnd')));

					row++;
					$row = $ws.find('row[r='+row+']');
				});
				
				var sumRow = row - 1;
				var $sumRow = $ws.find('row[r='+sumRow+']');
				var startRow = sumRow - (rot.nbjours - 1) * 5

				// Somme H1
				$sumRow.find('c[r=AB'+sumRow+']')
					.removeAttr('t')
					.append('<f>IF(AC'+sumRow+'="","",SUM(AA'+startRow+':AA'+sumRow+'))</f><v>'+real(rot, 'H1')+'</v>');

				// Hca
				$sumRow.find('c[r=AC'+sumRow+']')
					.removeAttr('t')
					.find('v').text(real(rot, 'Hca'));

				// H2
				$sumRow.find('c[r=AD'+sumRow+']')
					.removeAttr('t')
					.find('v').text(real(rot, 'H2'));
			});

			_.forEach(Planning.Remu.joursSol, function (jour) {
				// Date
				$row.find('c[r=A'+row+']')
					.append('<v>'+ datenum(moment(jour.date)) +'</v>');

				// Type
				$row.find('c[r=E'+row+']')
					.attr('t', 's')
					.find('v')
					.text(SharedStrings.lookup('Sol'));

				// Hcs
				$row.find('c[r=M'+row+']')
					.removeAttr('t')
					.find('v')
					.text(jour.Hcs);
				row += 5;
			});

			// _.forEach(currentData.delegation, function (evt) {
			// 	// Date
			// 	$row.find('c[r=A'+row+']')
			// 		.append('<v>'+ datenum(evt.start) +'</v>');

			// 	// Type
			// 	$row.find('c[r=E'+row+']')
			// 		.attr('t', 's')
			// 		.find('v')
			// 		.text(SharedStrings.lookup('Déleg.'));

			// 	// Hcsr
			// 	$row.find('c[r=M'+row+']')
			// 		.removeAttr('t')
			// 		.find('v')
			// 		.text(6.00);
			// 	row += 5;
			// });

			$row = $ws.find('row[r=98]');
			$row.find('c[r=J98]')
				.find('v')
				.text(Planning.Remu.tvt);

			$row.find('c[r=K98]')
				.find('v')
				.text(real(Planning.Remu, 'tvt'));

			$row.find('c[r=M98] v')
				.text(Planning.Remu.Hcs + Planning.Remu.Hcsr + Planning.Remu.Hcsi);

			$row.find('c[r=S98] v')
				.text(real(Planning.Remu, 'Hcnuit'));

			$row.find('c[r=AD98] v')
				.text(real(Planning.Remu, 'H2'));

			zip.file('xl/worksheets/sheet1.xml', xmlToString(wsxml));
			SharedStrings.save();

			if (App.support.isMobile && App.support.isSafari) {
				var link = document.createElement("a");
				link.download = 'décompte_' + (Planning.currentMonth.month()+1) + '_' + Planning.currentMonth.year() + '.xlsx';
				link.href = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + zip.generate({type:"base64"});
				link.click();
			} else {
				var content = zip.generate({type:"arraybuffer"});
				var blob = new Blob([content], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
				saveAs(blob, 'décompte_' + (Planning.currentMonth.month()+1) + '_' + Planning.currentMonth.year() + '.xlsx');
			}
		});
	}
};