/**
 * @authors jiaping.shenjp
 * @date    2013-07-09 14:51:55
 * @version 1.0
 */
#include "../vendor/underscore.js"
#include "../vendor/underscore.string.js"
#include "../vendor/json2.js"
#include "PSD.selection.jsx"
#include "PSD.layer.jsx"
#include "PSD.net.jsx"

var PSDParse = function(){
    this.init.apply(this,arguments);
}

PSDParse.prototype = {
    init:function(){
        this.docs = app.documents;
        this.activeDoc = app.activeDocument;
        this.allArtLayers = [];
        this.visibleArtLayers = [];
        this.specialLayers = [];
        this.handledLayers = [];
        this.textLayers = [];
        this.functionArtLayerInfos = [];
        this.groupingArray = [];
        this.orderGroupingArray = [];
        this.orderGroupingInfos = [];
        this.rootDom = null;
    },
    parse:function(){
        var savedState = this.activeDoc.activeHistoryState;
        this.dealWithSpecialLayoutSet(this.activeDoc);
        this.findAllArtLayers(this.activeDoc);
        this.findAllVisibleArtLayers(this.activeDoc);
        this.specialLayers = this.getSpecialLayers();
        this.textLayers = this.findTextLayer();
        $.writeln("parse visibleArtLayers:",this.visibleArtLayers.length);
        $.writeln("parse specialLayers:",this.specialLayers.length);
        $.writeln("parse textLayers:",this.textLayers.length);
        this.measureAllFunctionArtLayer();
        this.grouping();
        this.orderGrouping();
        this.groupingByArea();
        this.makeDomModel();
        this.insertHerfInfo();
        this.sliceAndExportBG();
        this.rootDom.analyseLayer();
        this.rootDom.removeLayer();
        this.saveJSONFile();
        // this.uploadData();
        //TODO:这里恢复历史，可能会报错
        this.activeDoc.activeHistoryState = savedState;
    },
    dealWithSpecialLayoutSet:function(layerSetsParent){
        var layerSets = layerSetsParent.layerSets;
        var layerName = "";
        var self = this;
        _.each(layerSets,function(layerSet){
            if(layerSet.visible){
                layerName = layerSet.name;
                if(self.isSpecialLayer(layerName)){
                    layerSet.merge();
                }else if(layerSet.layerSets.length>0){
                    self.dealWithSpecialLayoutSet(layerSet);
                }
            }
        });
    },
    findAllArtLayers:function(layersParent){
        var layers = layersParent.layers;
        var self = this;
        _.each(layers,function(layer){
            if(layer.typename == "ArtLayer"){
                self.allArtLayers.push(layer);
            }else if(layer.typename == "LayerSet"){
                self.findAllArtLayers(layer);
            }
        });
    },
    findAllVisibleArtLayers:function(layersParent){
        var self = this;
        self.visibleArtLayers = _.filter(self.allArtLayers,function(layer){
                                                            return layer.visible
                                                        });
    },
    isSpecialLayer:function(name){
        var reg = /^#/;
        return reg.test(name);
    },
    findTextLayer:function(){
        var arr = [];
        var self = this;
        _.each(this.visibleArtLayers,function(layer){
            if(layer.kind.toString() === "LayerKind.TEXT" && _.indexOf(self.handledLayers,layer)<0){
                arr.push(layer);
                self.handledLayers.push(layer);
            }
        });
        return arr;
    },
    getSpecialLayers:function(){
        var arr = [];
        var self = this;
        var layerName = "";
        var self = this;
        _.each(this.visibleArtLayers,function(layer){
            layerName = _.string.trim(layer.name);
            if(self.isSpecialLayer(layerName) && _.indexOf(self.handledLayers,layer)<0){
                arr.push(layer);
                self.handledLayers.push(layer);
            }
        });
        return arr;
    },
    measureAllFunctionArtLayer:function(){
        var self = this;
        var arr = this.specialLayers.concat(this.textLayers);
        var bounds,left,top,width,height;
        _.each(arr,function(layer){
            //#href为标记href链接的层，特殊处理
            if(layer.name == "#href"){
                return;
            }
            bounds = layer.bounds;
            left = bounds[0].value;
            top = bounds[1].value;
            right = bounds[2].value;
            bottom = bounds[3].value;
            // $.writeln(layer.name,":",left,"   ",top,"   ",right-left,"   ",bottom-top);
            var obj = {
                name:layer.name,
                left:left,
                top:top,
                right:right,
                bottom:bottom,
                width:right-left,
                height:bottom-top,
                layer:layer
            };
            self.functionArtLayerInfos.push(obj);
        });
        // _.each(this.functionArtLayerInfos,function(item){
        //     $.writeln("spec:",JSON.stringify(item));
        // });
    },
    grouping:function(){
        var self = this;
        var maxHeightLayerInfo,resultArr;
        // $.writeln("parse functionArtLayerInfos-----:",this.functionArtLayerInfos.length);
        while(this.functionArtLayerInfos.length>0){
            // $.writeln("parse functionArtLayerInfos:",this.functionArtLayerInfos.length);
            maxHeightLayerInfo = self.findMaxHeightLayerInfo();
            self.removeInfos([maxHeightLayerInfo]);
            resultArr = [maxHeightLayerInfo];
            resultArr = self.findWithInLayers(resultArr,[maxHeightLayerInfo]);
            // $.writeln("parse resultArr-----:",resultArr.length);
            self.removeInfos(resultArr);
            self.groupingArray.push(resultArr);
        }
        // $.writeln("parse grouping:",self.groupingArray.length,this.functionArtLayerInfos.length,self.whileInt);
        // _.each(self.groupingArray,function(item){
        //     $.writeln("grouping result:",JSON.stringify(item));
        //     $.writeln("");
        // });
    },
    findMaxHeightLayerInfo:function(){
        var height = 0,maxHeight = 0, layerInfo;
        _.each(this.functionArtLayerInfos,function(info){
            height = info.height;
            if(height > maxHeight){
                maxHeight = height;
                layerInfo = info;
            }
        })
        return layerInfo;
    },
    removeInfos:function(layerInfos){
        // $.writeln("parse functionArtLayerInfos before:",this.functionArtLayerInfos.length);
        this.functionArtLayerInfos = _.difference(this.functionArtLayerInfos,layerInfos);
        // $.writeln("parse functionArtLayerInfos after:",this.functionArtLayerInfos.length);
    },
    findWithInLayers:function(resultArr,layerInfos){
        var arr,tempTop,tempBottom,layerInfoTop,layerInfoBottom;
        var self = this;
        _.each(layerInfos,function(layerInfo){
            arr = [];
            layerInfoTop  = layerInfo.top;
            layerInfoBottom  = layerInfo.bottom;
            _.each(self.functionArtLayerInfos,function(tempLayerInfo){
                if(_.indexOf(resultArr,tempLayerInfo)>-1){
                    return;
                }
                tempTop = tempLayerInfo.top;
                tempBottom = tempLayerInfo.bottom;
                if((layerInfoBottom>=tempBottom && layerInfoTop<=tempBottom) || (layerInfoTop<=tempTop && layerInfoBottom>=tempTop)){
                    arr.push(tempLayerInfo);
                }
            });
            if(arr.length>0){
                _.each(arr,function(tempLayerInfo){
                    resultArr.push(tempLayerInfo);
                });
                self.findWithInLayers(resultArr,arr);
            }
        });
        return resultArr;
    },
    orderGrouping:function(){
        // $.writeln("orderGrouping...........");
        this.orderGroupingArray = _.sortBy(this.groupingArray,function(group){ 
                                                return _.max(group,function(layerInfo){ 
                                                                    return layerInfo.bottom;
                                                                }).bottom;
                                            });
        // _.each(this.orderGroupingArray,function(group){
        //     $.writeln(JSON.stringify(group));
        //     $.writeln("............");
        // });
    },
    groupingByArea:function(){
        var idx = 0,loopNum = this.orderGroupingArray.length, maxBottom = 0, savedBottom = 0;
        var docWidth = this.activeDoc.width.value,
            docHeight = this.activeDoc.height.value;
        var self = this;
        var styleData;
        _.each(this.orderGroupingArray,function(group){
            maxBottom = _.max(group,function(layerInfo){
                return layerInfo.bottom;
            }).bottom;
            styleData = {
                            x:0,
                            y:savedBottom,
                            width:docWidth,
                            height:(idx + 1) === loopNum ? docHeight - savedBottom : maxBottom - savedBottom
                        };
            self.orderGroupingInfos.push({style:styleData});
            savedBottom = maxBottom;
            idx++;
        });
    },
    makeDomModel:function(){
        var idx = 0,orderInfo,layerInfo;
        var self = this;
        layerInfo = {
                    name:this.activeDoc.name,
                    style:{
                        x:0,
                        y:0,
                        width:this.activeDoc.width.value,
                        height:this.activeDoc.height.value
                    }
                }
        this.rootDom = new DomModel(layerInfo);
        _.each(this.orderGroupingArray,function(group){
            orderInfo = self.orderGroupingInfos[idx];
            var groupDom = new DomModel(orderInfo);
            _.each(group,function(info){
                layerInfo = {
                    name:info.name,
                    layer:info.layer,
                    style:{
                        x:info.left,
                        y:info.top,
                        width:info.width,
                        height:info.height
                    }
                }
                groupDom.addChild(new DomModel(layerInfo));
            });
            self.rootDom.addChild(groupDom);
            idx++;
        });
        // $.writeln("makeDomModel:",JSON.stringify(self.rootDom));
    },
    insertHerfInfo:function(){
        var self = this;
        var hrefLayer = _.find(this.allArtLayers,function(layer){
                                                return _.string.trim(layer.name)  === "#href"; 
                                            });
        if(hrefLayer){
            try{
                var layerInfo = {
                        name:hrefLayer.name,
                        text:hrefLayer.textItem.contents
                    }
                var hrefDom = new DomModel(layerInfo);
                self.rootDom.addChild(hrefDom);
            }catch(e){
                $writeln($.fileName, $.line, e , "insertHerfInfo function");
            }
        }
    },
    sliceAndExportBG: function(){
        var contentLayers = this.textLayers.concat(this.specialLayers);
        PSD.layer.hideLayers(contentLayers);
        
        var region = [],imgInfo;
        var self = this;
        // try{
        region = self.rootDom.getRegion();
        if(!region){
            $.writeln(self.rootDom.name," region is null");
            return;
        }
        imgInfo = {
            name:"bg"
        };
        imgInfo = PSD.selection.exportSelectionToImg(region, imgInfo);
        if(!imgInfo){
            return;
        }
        self.rootDom.style.background = {
            image:imgInfo.name
        };
        // }catch(e){
            // $.util.log($.fileName, $.line, e , layer.name);
        //     $.writeln($.fileName, $.line, e);
        // }
        PSD.layer.showLayers(contentLayers);
    },
    saveJSONFile:function(){
        var savaJSON = {
            author:"sa",
            fileName:this.activeDoc.name,
            dom:this.rootDom
        };
        PSD.file.write("/Users/apple/Desktop/slices/json.txt",JSON.stringify(savaJSON));
        $.writeln("end-------");
        $.writeln("end-------:\n",JSON.stringify(savaJSON));
    },
    uploadData:function(){
        $.writeln("uploadData....");
        $.writeln("uploadData....");
        var from = 'shandan';
        var list = PSD.file.getFilesList("/Users/apple/Desktop/slices/",[".DS_Store"]);
        var files = {}, name;
        for (var i = 0; i < list.length; i++) {
            name = list[i].name;
            files[name] = list[i];
        }
        var options = {
            dataType:"POST",
            url:"http://10.16.40.20/upload",
            // url:"http://preview.fd.com/upload",
            port:2000,
            data:{from:from},
            files:files //{index: File("d:\\psd2html\\test00\\index.html"), slice_325: File("d:\\psd2html\\test00\\slices\\slice_325.jpg")}
        };
        $.writeln("uploadData....",JSON.stringify(options));
        PSD.net.connect(options);
    }
}