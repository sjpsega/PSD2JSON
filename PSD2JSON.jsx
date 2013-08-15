/*
<javascriptresource> 
<name>PSD2JSON</name> 
<menu>help</menu> 
<enableinfo>true</enableinfo> 
</javascriptresource>
*/
#include "vendor/underscore.js"
#include "lib/DomModel.jsx"
#include "lib/PSDParse.jsx"

app.bringToFront(); 
// Set Adobe Photoshop CS5 to use pixels and display no dialogs
app.displayDialogs = DialogModes.NO; // suppress all dialogs
app.preferences.rulerUnits = Units.PIXELS;
app.preferences.typeUnits = TypeUnits.PIXELS;

(function(){
    var parse = new PSDParse();
    parse.parse();
})()