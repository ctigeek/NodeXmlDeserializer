var regexString = "^<[A-Za-z0-9:]+([ ]+[A-Za-z0-9:]+ *= *\"[^\"<>]*\")* *\/*>";

var property = function(propertyString) {
    var index = propertyString.indexOf("=");
    this.name = propertyString.substring(0, index);
    this.value = propertyString.substring(index+1);
    if (/^"/.test(this.value)) {
        this.value = this.value.substring(1);
    }
    if (/"$/.test(this.value)) {
        this.value = this.value.substring(0,this.value.length-1);
    }
};

var element = function(openingTag, localNamespace) {
    var removedBrackets = openingTag.replace("<","").replace("/>","").replace(">","");
    var propArray = removedBrackets.trim().split(" ");
    this.raw = openingTag;
    var name = propArray[0].trim();
    var nsindx = name.indexOf(":");
    if (nsindx > 0) {
       this.namespaceAbbreviation = name.substring(0,nsindx);
       this.name = name.substring(nsindx+1);
    }
    else {
        this.namespaceAbbreviation = "";
        this.name = name;
    }
    this.isArray = false;
    this.isSelfClosing = /\/>$/.test(openingTag);
    this.properties = new Array();
    this.body = "";
    this.namespace = "";
    this.children = new Array();
    for (var i=1; i<propArray.length; i++) {
        var prop = new property(propArray[i]);
        if (prop.name.indexOf("xmlns") == 0) {
            nsindx = prop.name.indexOf(":");
            if (nsindx > 0) {
                var abbreviation = prop.name.substring(nsindx+1);
                element.namespaces[abbreviation] = prop.value;
            }
            else if (this.namespaceAbbreviation == "") {
                this.namespace = prop.value;
            }
        }
        else {
            this.properties.push(prop);
        }
    }
    this.closingTag = "<\/" + this.name + ">";
    if (this.namespaceAbbreviation != "") {
        this.closingTag = "<\/" + this.namespaceAbbreviation + ":" + this.name + ">";
        this.namespace = element.namespaces[this.namespaceAbbreviation];
    }
    else if (localNamespace && this.namespace == "") {
        this.namespace = localNamespace;
    }
};

element.prototype.addChildElement = function(child) {
    this.children.push(child);
 };

element.prototype.processInnerElement = function(body) {
    var innerElements = deserializeXml(body, this.namespace);
    if (innerElements.length == 0) {
        if (element.cDataData && ~body.indexOf("$~$~") && element.cDataData[body]) {
            this.body = element.cDataData[body];
        }
        else {
            this.body = body;
        }
    }
    else {
        for (var i=0; i<innerElements.length; i++) {
            this.addChildElement(innerElements[i]);
        }
    }
};

element.prototype.getBodyJson = function() {
    //http://stackoverflow.com/questions/42068/how-do-i-handle-newlines-in-json
    return this.body.replace("\r","\\\\r")
                    .replace("\n","\\\\n")
                    .replace("\t","\\\\t")
                    .replace("\"","\\\"")
                    .replace("\\","\\\\");
};

element.cDataData = null;
element.namespaces = {};

element.prototype.getJson = function(arrayNames) {
        //TODO: this is a mess....
        var json = "";
        if (arrayNames.indexOf(this.name) < 0) {
            json = "\"" + this.name + "\":{";
        }
        var baseLength = json.length;
        for (var i=0; i< this.properties.length; i++) {
            if (i > 0) json += ",";   
            json += "\"" + this.properties[i].name + "\":\"" + this.properties[i].value + "\"";
        }
        if (this.children.length == 0) {
            if (json.length > baseLength) json += ",";
            if (arrayNames.indexOf(this.name) >= 0) {
                json += "\"" + this.getBodyJson() + "\"";
            }
            else {
                json += "\"value\":\"" + this.getBodyJson() + "\"";
            }
        }
        else {
            var childArrays = {};
            for (var i=0; i< this.children.length; i++) {
                if (arrayNames.indexOf(this.children[i].name) >= 0) {
                    if (!childArrays[this.children[i].name]) childArrays[this.children[i].name] = new Array();
                    childArrays[this.children[i].name].push(this.children[i].getJson(arrayNames));
                }
                else {
                    if (json.length > baseLength) json += ",";
                    json += this.children[i].getJson(arrayNames);
                }
            }
            if (json.length > baseLength && Object.keys(childArrays).length > 0 ) json += ",";
            var commaFlag = false;
            for (var name in childArrays) {
                if (commaFlag) json += ",";
                json += "\"arrayOf_" + name + "\":[";
                for (var i=0;i < childArrays[name].length; i++) {
                    if (i > 0) json += ",";
                    json += childArrays[name][i];
                }
                commaFlag = true;
                json += "]";
            }
        }
        if (arrayNames.indexOf(this.name) < 0) {
            json += "}";
        }
    return json;
 };

var deserializeXml = function(stringXml, localNamespace) {
    var elementArray = new Array();
    var startIndex = 0;
    while (startIndex < stringXml.length) {
        var regEx = new RegExp(regexString);
        var slimXml = stringXml.substring(startIndex).trim();
        if (regEx.test(slimXml)) {
            var regExMatch = regEx.exec(slimXml)[0];
            var ele = new element(regExMatch, localNamespace);
            if (!ele.isSelfClosing) {
                
                var regexEnd = new RegExp(ele.closingTag);
                var endIndex = slimXml.search(regexEnd);
                if (endIndex > 0) {
                    var endMatch = regexEnd.exec(slimXml)[0];
                    var elementBody = slimXml.substring(regExMatch.length, endIndex);
                    ele.processInnerElement(elementBody);
                    startIndex += endIndex + endMatch.length;
                }
                else {
                    throw new Error("Missing end tag for opening tag " + ele.name);
                }
            }
            else {
                startIndex += regExMatch.length;
            }
            elementArray.push(ele);
        }
        else {
            startIndex += stringXml.length;
        }
    }
    return elementArray;
};

var deserializer = function(arrayNames) {
    this.arrayNames = arrayNames || new Array();
};

var ExtractCData = function(stringXml) {
    var cDataData = {};
    var cDataLess = stringXml;
    var cDataStart = "<![CDATA[";
    var cDataEnd = "]]>";
    var counter = 1111;
    var index = cDataLess.indexOf(cDataStart);
    while (index >= 0) {
        index += cDataStart.length;
        var endIndex = cDataLess.indexOf(cDataEnd, index +1);
        var cdata = cDataLess.substring(index, endIndex);
        var key = "$~$~" + counter.toString();
        cDataData[key] = cdata;
        cDataLess = cDataLess.replace(cDataStart+cdata+cDataEnd,key);
        counter++;
        index = cDataLess.indexOf(cDataStart, index);
    }
    element.cDataData = cDataData;
    return cDataLess;
};

deserializer.prototype.getJson = function(elementArray) {
    if (elementArray.length == 0) {
        //throw error?
    }
    else if (elementArray.length == 1) {
        return "{" + elementArray[0].getJson(this.arrayNames) + "}";
    }
    else {
        var json = "[";
        for (var i = 0; i < elementArray.length; i++) {
            if (i > 0) json += ","
            json += "{" + elementArray[i].getJson(this.arrayNames) + "}";
        }
        json += "]";
    }
};

deserializer.prototype.deserialize = function(stringXml) {
    var cleanXml = ExtractCData(stringXml);
    cleanXml = cleanXml.replace("\r","").replace("\n","").trim();
    return deserializeXml(cleanXml);
};

module.exports = {
    property : property,
    element : element,
    deserializer : deserializer
};