var regexXmlDeclaration = /^ *<\?xml .* \?>/;
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

element.processEntities = function(bodyString) {
    return bodyString.replace(/\&quot/g,"\"")
                        .replace(/\&amp/g,"&")
                        .replace(/\&apos/g,"'")
                        .replace(/\&lt/g,"<")
                        .replace(/\&gt/g,">");
};

element.prototype.processInnerElement = function(body) {
    var innerElements = deserializeXml(body, this.namespace);
    if (innerElements.length == 0) {
        if (element.cDataData && ~body.indexOf("$~$~") && element.cDataData[body]) {
            this.body = element.cDataData[body];
        }
        else {
            this.body = element.processEntities(body);
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
    return this.body.replace(/\\/g,"\\\\")
                    .replace(/\r/g,"\\\\r")
                    .replace(/\n/g,"\\\\n")
                    .replace(/\t/g,"\\\\t")
                    .replace(/\"/g,"\\\"");
};

element.cDataData = null;
element.namespaces = {};

element.prototype.getJson = function(arrayNames) {
        //TODO: this is a mess....
        var json = "";
        if (arrayNames.indexOf(this.name) < 0) {
            json = "\"" + camelCase(this.name) + "\":{";
        }
        var baseLength = json.length;
        for (var i=0; i< this.properties.length; i++) {
            if (i > 0) json += ",";   
            json += "\"" + camelCase(this.properties[i].name) + "\":\"" + this.properties[i].value + "\"";
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
                json += "\"arrayOf_" + camelCase(name) + "\":[";
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

 var camelCase = function(string) {
    if (_convertToCamelCase) {
        var newString = string[0].toLowerCase() + string.substr(1);
        return newString;
    }
    else {
        return string;
    }
}

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
                    var elementBody = slimXml.substring(regExMatch.length, endIndex).trim();
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

var extractCData = function(stringXml) {
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

var removeDeclaration = function(stringXml) {
    if (regexXmlDeclaration.test(stringXml)) {
        var regExMatch = regexXmlDeclaration.exec(stringXml)[0];
        return (stringXml.substring(regExMatch.length));
    }
    return stringXml;
};

var getJson = function(elementArray, arrayNames) {
    arrayNames = arrayNames || new Array();
    if (elementArray.length == 0) {
        //throw error?
    }
    else if (elementArray.length == 1) {
        return "{" + elementArray[0].getJson(arrayNames) + "}";
    }
    else {
        var json = "[";
        for (var i = 0; i < elementArray.length; i++) {
            if (i > 0) json += ","
            json += "{" + elementArray[i].getJson(arrayNames) + "}";
        }
        json += "]";
    }
};

var deserialize = function(stringXml) {
    var cleanXml = removeDeclaration(stringXml)
    cleanXml = extractCData(cleanXml)
                   .replace("\r","")
                   .replace("\n","")
                   .trim();
    return deserializeXml(cleanXml);
};

var _convertToCamelCase = true;
var convertToCamelCase = function(val) {
    if (val !== null) {
        _convertToCamelCase = val;
    }
    else {
        return _convertToCamelCase;
    }
};

module.exports = {
    property : property,
    element : element,
    deserialize : deserialize,
    getJson : getJson,
    convertToCamelCase : convertToCamelCase
};