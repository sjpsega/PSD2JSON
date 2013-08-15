/**
 * @author shandan.com@gmail.com
 * @20130707
 * PSD 选区操作
 */
#include "PSD.jsx"
#include "PSD.config.jsx"
PSD.selection = {
	/**
	 * 选择选区
	 * @param {Array} region 选区的四点坐标，例如： [[0, 0], [200, 0], [200, 50], [0,50]]
	 */
	activeSelection: function(region) {
        if (!region) return;
        var selection = app.activeDocument.selection;
        selection.select(region);	
	},
	
	/**
	 * 取消选区
	 */
	inActiveSelection: function() {
        var selection = app.activeDocument.selection;
        selection.deselect();	
	},
	
	/**
	 * 判断选区是否单色
	 */
	
	isSelectionMonochrome: function(region) {
		var	selection = app.activeDocument.selection
		,	cs = app.activeDocument.channels
		;
			
		selection.select(region);
		for(var i = 0, l = cs.length; i < l; i++){
			var histogram = cs[i].histogram.concat();
			histogram.sort().reverse();
			if (histogram[1] != 0) {
				return false;
			}
		}
		return true;		
	},		
	
	/**
	 * 选区生成新图层
	 */
	
	selToNewLayer: function() {
	    var idCpTL = charIDToTypeID( "CpTL" );
	    executeAction( idCpTL, undefined, DialogModes.NO );		
	},
	
	/**
	 * 选区导出图片
	 */
    exportSelectionToImg: function(region, imgInfo){
        if(!region){
        	return;
        }
        var exportConfig = PSD.config.getExportConfig();
        var extension = PSD.config.getExtension(exportConfig);
        // copy selected area
        var selection = app.activeDocument.selection, xset = [], yset = [];
        selection.select(region);
        selection.copy(true);
        
        for(var i = 0, l = region.length; i < l; i++){
            xset.push(region[i][0]);
            yset.push(region[i][1]);
        }
        
        xset.sort(function(a,b){return a-b;});
        yset.sort(function(a,b){return a-b;});
        var width = xset[xset.length-1] - xset[0],
            height = yset[yset.length-1] - yset[0];
        
        // export image
        var newDoc = app.documents.add(width, height);
        newDoc.paste();
        newDoc.layers[newDoc.layers.length - 1].remove();
        
        var slicesFolder = new Folder("/Users/apple/Desktop" + '/slices/');
        !slicesFolder.exists && slicesFolder.create();
        
        var outputImgName = imgInfo.name+"."+extension;
        var img = new File(slicesFolder + "/" + outputImgName);
        newDoc.exportDocument (img, ExportType.SAVEFORWEB, exportConfig);
        newDoc.close(SaveOptions.DONOTSAVECHANGES);
        selection.deselect();
        return {name:outputImgName};
    }
};