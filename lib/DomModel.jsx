/**
 * @authors jiaping.shenjp
 * @date    2013-07-09 14:51:55
 * @version 1.0
 */
#include "../vendor/underscore.js"
#include "../vendor/underscore.string.js"
#include "Util.jsx"
#include "PSD.layer.jsx"
#include "PSD.selection.jsx"
#include "PSD.file.jsx"

var DomModel = function(){
    this.init.apply(this,arguments);
};

DomModel.prototype = {
    init:function(dataObj){
        var self = this;
        this.style = {};
        this.text = "";
        this.name = "";
        this.tag = "div";
        this.children = [];
        this.layer = null;
        _.each(dataObj,function(value,key){
            if(_.has(self,key)){
                self[key] = value;
            }
        });
    },
    addChild:function(child){
        if(child){
            this.children.push(child);
        }
    },
    analyseLayer:function(){
        this._analyseLayer();
        if(this.children){
            _.each(this.children,function(domModel){
                domModel.analyseLayer();
            });
        }
    },
    removeLayer:function(){
        if(this.layer){
            delete this.layer;
        }
        if(this.children){
            _.each(this.children,function(domModel){
                domModel.removeLayer();
            });
        }
    },
    _analyseLayer:function(){
        if(this.layer){
            var layerName = _.string.trim(this.name);
            if(_.string.startsWith(layerName,"#a")){
                this._dealALink();
            }
            if(_.string.startsWith(layerName,"#img")){
                this._dealImg();
            }
            if(this.layer.kind.toString() === "LayerKind.TEXT"){
                this._dealTxt();
            }
        }
    },
    getRegion:function(){
        var styleData = this.style;
        if(styleData){
            return [[styleData.x, styleData.y], [styleData.x + styleData.width, styleData.y], [styleData.x + styleData.width, styleData.y + styleData.height], [styleData.x, styleData.y+styleData.height]];
        }
        return null;
    },
    description:function(){
        var desc = "";
        _.each(this,function(value,key){
            desc += key+":"+value+"    "; 
        });
       $.writeln(desc);
    },
    _dealALink:function(){
        this.tag = "a";
        // this.text = this.layer.textItem.contents;
    },
    _dealImg:function(){
        var region = this.getRegion();
        if(!region){
            $.writeln(this.name," region is null");
            return;
        }
        // $.writeln(this.name,":",this.style.x,"   ",this.style.y,"   ",this.style.width,"   ",this.style.height);
        var imgInfo = {
            name:"img_slice_"+Util.getUID()
        }
        imgInfo = PSD.selection.exportSelectionToImg(region,imgInfo);
        if(!this.style.background){
            this.style.background = {};
        }
        this.style.background.image = imgInfo.name;
    },
    _dealTxt:function(){
        this.text = this.layer.textItem.contents;
        // this.text = PSD.layer.getTxtLayerInfo(this.layer);
    }
};