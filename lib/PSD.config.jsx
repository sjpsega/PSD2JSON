/**
 * @authors jiaping.shenjp
 * @date    2013-08-07 14:51:55
 * @version 1.0
 */
#include "PSD.jsx"

PSD.config = {
   getExtension : function(op){
        switch(op.format){
            case SaveDocumentType.JPEG:
                return 'jpg';
            case SaveDocumentType.PNG:
                return 'png';
            default:
                return 'gif';
        }
    },
    getExportConfig : function(){
        var exportConfig = new ExportOptionsSaveForWeb();
        exportConfig.format = SaveDocumentType.JPEG;
        exportConfig.quality = 60;
        return exportConfig;
    }
};
