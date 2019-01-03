const directives=new WeakMap;const directive=f=>(...args)=>{const d=f(...args);directives.set(d,true);return d};const isDirective=o=>typeof o==="function"&&directives.has(o);const isCEPolyfill=window.customElements!==undefined&&window.customElements.polyfillWrapFlushCallback!==undefined;const reparentNodes=(container,start,end=null,before=null)=>{let node=start;while(node!==end){const n=node.nextSibling;container.insertBefore(node,before);node=n}};const removeNodes=(container,startNode,endNode=null)=>{let node=startNode;while(node!==endNode){const n=node.nextSibling;container.removeChild(node);node=n}};const noChange={};const marker=`{{lit-${String(Math.random()).slice(2)}}}`;const nodeMarker=`\x3c!--${marker}--\x3e`;const markerRegex=new RegExp(`${marker}|${nodeMarker}`);const boundAttributeSuffix="$lit$";class Template{constructor(result,element){this.parts=[];this.element=element;let index=-1;let partIndex=0;const nodesToRemove=[];const _prepareTemplate=template=>{const content=template.content;const walker=document.createTreeWalker(content,133,null,false);let previousNode;let currentNode;while(walker.nextNode()){index++;previousNode=currentNode;const node=currentNode=walker.currentNode;if(node.nodeType===1){if(node.hasAttributes()){const attributes=node.attributes;let count=0;for(let i=0;i<attributes.length;i++){if(attributes[i].value.indexOf(marker)>=0){count++}}while(count-- >0){const stringForPart=result.strings[partIndex];const name=lastAttributeNameRegex.exec(stringForPart)[2];const attributeLookupName=name.toLowerCase()+boundAttributeSuffix;const attributeValue=node.getAttribute(attributeLookupName);const strings=attributeValue.split(markerRegex);this.parts.push({type:"attribute",index:index,name:name,strings:strings});node.removeAttribute(attributeLookupName);partIndex+=strings.length-1}}if(node.tagName==="TEMPLATE"){_prepareTemplate(node)}}else if(node.nodeType===3){const nodeValue=node.nodeValue;if(nodeValue.indexOf(marker)<0){continue}const parent=node.parentNode;const strings=nodeValue.split(markerRegex);const lastIndex=strings.length-1;partIndex+=lastIndex;for(let i=0;i<lastIndex;i++){parent.insertBefore(strings[i]===""?createMarker():document.createTextNode(strings[i]),node);this.parts.push({type:"node",index:index++})}parent.insertBefore(strings[lastIndex]===""?createMarker():document.createTextNode(strings[lastIndex]),node);nodesToRemove.push(node)}else if(node.nodeType===8){if(node.nodeValue===marker){const parent=node.parentNode;const previousSibling=node.previousSibling;if(previousSibling===null||previousSibling!==previousNode||previousSibling.nodeType!==Node.TEXT_NODE){parent.insertBefore(createMarker(),node)}else{index--}this.parts.push({type:"node",index:index++});nodesToRemove.push(node);if(node.nextSibling===null){parent.insertBefore(createMarker(),node)}else{index--}currentNode=previousNode;partIndex++}else{let i=-1;while((i=node.nodeValue.indexOf(marker,i+1))!==-1){this.parts.push({type:"node",index:-1})}}}}};_prepareTemplate(element);for(const n of nodesToRemove){n.parentNode.removeChild(n)}}}const isTemplatePartActive=part=>part.index!==-1;const createMarker=()=>document.createComment("");const lastAttributeNameRegex=/([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F \x09\x0a\x0c\x0d"'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;class TemplateInstance{constructor(template,processor,options){this._parts=[];this.template=template;this.processor=processor;this.options=options}update(values){let i=0;for(const part of this._parts){if(part!==undefined){part.setValue(values[i])}i++}for(const part of this._parts){if(part!==undefined){part.commit()}}}_clone(){const fragment=isCEPolyfill?this.template.element.content.cloneNode(true):document.importNode(this.template.element.content,true);const parts=this.template.parts;let partIndex=0;let nodeIndex=0;const _prepareInstance=fragment=>{const walker=document.createTreeWalker(fragment,133,null,false);let node=walker.nextNode();while(partIndex<parts.length&&node!==null){const part=parts[partIndex];if(!isTemplatePartActive(part)){this._parts.push(undefined);partIndex++}else if(nodeIndex===part.index){if(part.type==="node"){const part=this.processor.handleTextExpression(this.options);part.insertAfterNode(node);this._parts.push(part)}else{this._parts.push(...this.processor.handleAttributeExpressions(node,part.name,part.strings,this.options))}partIndex++}else{nodeIndex++;if(node.nodeName==="TEMPLATE"){_prepareInstance(node.content)}node=walker.nextNode()}}};_prepareInstance(fragment);if(isCEPolyfill){document.adoptNode(fragment);customElements.upgrade(fragment)}return fragment}}class TemplateResult{constructor(strings,values,type,processor){this.strings=strings;this.values=values;this.type=type;this.processor=processor}getHTML(){const endIndex=this.strings.length-1;let html="";for(let i=0;i<endIndex;i++){const s=this.strings[i];let addedMarker=false;html+=s.replace(lastAttributeNameRegex,(_match,whitespace,name,value)=>{addedMarker=true;return whitespace+name+boundAttributeSuffix+value+marker});if(!addedMarker){html+=nodeMarker}}return html+this.strings[endIndex]}getTemplateElement(){const template=document.createElement("template");template.innerHTML=this.getHTML();return template}}const isPrimitive=value=>value===null||!(typeof value==="object"||typeof value==="function");class AttributeCommitter{constructor(element,name,strings){this.dirty=true;this.element=element;this.name=name;this.strings=strings;this.parts=[];for(let i=0;i<strings.length-1;i++){this.parts[i]=this._createPart()}}_createPart(){return new AttributePart(this)}_getValue(){const strings=this.strings;const l=strings.length-1;let text="";for(let i=0;i<l;i++){text+=strings[i];const part=this.parts[i];if(part!==undefined){const v=part.value;if(v!=null&&(Array.isArray(v)||typeof v!=="string"&&v[Symbol.iterator])){for(const t of v){text+=typeof t==="string"?t:String(t)}}else{text+=typeof v==="string"?v:String(v)}}}text+=strings[l];return text}commit(){if(this.dirty){this.dirty=false;this.element.setAttribute(this.name,this._getValue())}}}class AttributePart{constructor(comitter){this.value=undefined;this.committer=comitter}setValue(value){if(value!==noChange&&(!isPrimitive(value)||value!==this.value)){this.value=value;if(!isDirective(value)){this.committer.dirty=true}}}commit(){while(isDirective(this.value)){const directive$$1=this.value;this.value=noChange;directive$$1(this)}if(this.value===noChange){return}this.committer.commit()}}class NodePart{constructor(options){this.value=undefined;this._pendingValue=undefined;this.options=options}appendInto(container){this.startNode=container.appendChild(createMarker());this.endNode=container.appendChild(createMarker())}insertAfterNode(ref){this.startNode=ref;this.endNode=ref.nextSibling}appendIntoPart(part){part._insert(this.startNode=createMarker());part._insert(this.endNode=createMarker())}insertAfterPart(ref){ref._insert(this.startNode=createMarker());this.endNode=ref.endNode;ref.endNode=this.startNode}setValue(value){this._pendingValue=value}commit(){while(isDirective(this._pendingValue)){const directive$$1=this._pendingValue;this._pendingValue=noChange;directive$$1(this)}const value=this._pendingValue;if(value===noChange){return}if(isPrimitive(value)){if(value!==this.value){this._commitText(value)}}else if(value instanceof TemplateResult){this._commitTemplateResult(value)}else if(value instanceof Node){this._commitNode(value)}else if(Array.isArray(value)||value[Symbol.iterator]){this._commitIterable(value)}else{this._commitText(value)}}_insert(node){this.endNode.parentNode.insertBefore(node,this.endNode)}_commitNode(value){if(this.value===value){return}this.clear();this._insert(value);this.value=value}_commitText(value){const node=this.startNode.nextSibling;value=value==null?"":value;if(node===this.endNode.previousSibling&&node.nodeType===Node.TEXT_NODE){node.textContent=value}else{this._commitNode(document.createTextNode(typeof value==="string"?value:String(value)))}this.value=value}_commitTemplateResult(value){const template=this.options.templateFactory(value);if(this.value&&this.value.template===template){this.value.update(value.values)}else{const instance=new TemplateInstance(template,value.processor,this.options);const fragment=instance._clone();instance.update(value.values);this._commitNode(fragment);this.value=instance}}_commitIterable(value){if(!Array.isArray(this.value)){this.value=[];this.clear()}const itemParts=this.value;let partIndex=0;let itemPart;for(const item of value){itemPart=itemParts[partIndex];if(itemPart===undefined){itemPart=new NodePart(this.options);itemParts.push(itemPart);if(partIndex===0){itemPart.appendIntoPart(this)}else{itemPart.insertAfterPart(itemParts[partIndex-1])}}itemPart.setValue(item);itemPart.commit();partIndex++}if(partIndex<itemParts.length){itemParts.length=partIndex;this.clear(itemPart&&itemPart.endNode)}}clear(startNode=this.startNode){removeNodes(this.startNode.parentNode,startNode.nextSibling,this.endNode)}}class BooleanAttributePart{constructor(element,name,strings){this.value=undefined;this._pendingValue=undefined;if(strings.length!==2||strings[0]!==""||strings[1]!==""){throw new Error("Boolean attributes can only contain a single expression")}this.element=element;this.name=name;this.strings=strings}setValue(value){this._pendingValue=value}commit(){while(isDirective(this._pendingValue)){const directive$$1=this._pendingValue;this._pendingValue=noChange;directive$$1(this)}if(this._pendingValue===noChange){return}const value=!!this._pendingValue;if(this.value!==value){if(value){this.element.setAttribute(this.name,"")}else{this.element.removeAttribute(this.name)}}this.value=value;this._pendingValue=noChange}}class PropertyCommitter extends AttributeCommitter{constructor(element,name,strings){super(element,name,strings);this.single=strings.length===2&&strings[0]===""&&strings[1]===""}_createPart(){return new PropertyPart(this)}_getValue(){if(this.single){return this.parts[0].value}return super._getValue()}commit(){if(this.dirty){this.dirty=false;this.element[this.name]=this._getValue()}}}class PropertyPart extends AttributePart{}let eventOptionsSupported=false;try{const options={get capture(){eventOptionsSupported=true;return false}};window.addEventListener("test",options,options);window.removeEventListener("test",options,options)}catch(_e){}class EventPart{constructor(element,eventName,eventContext){this.value=undefined;this._pendingValue=undefined;this.element=element;this.eventName=eventName;this.eventContext=eventContext;this._boundHandleEvent=(e=>this.handleEvent(e))}setValue(value){this._pendingValue=value}commit(){while(isDirective(this._pendingValue)){const directive$$1=this._pendingValue;this._pendingValue=noChange;directive$$1(this)}if(this._pendingValue===noChange){return}const newListener=this._pendingValue;const oldListener=this.value;const shouldRemoveListener=newListener==null||oldListener!=null&&(newListener.capture!==oldListener.capture||newListener.once!==oldListener.once||newListener.passive!==oldListener.passive);const shouldAddListener=newListener!=null&&(oldListener==null||shouldRemoveListener);if(shouldRemoveListener){this.element.removeEventListener(this.eventName,this._boundHandleEvent,this._options)}if(shouldAddListener){this._options=getOptions(newListener);this.element.addEventListener(this.eventName,this._boundHandleEvent,this._options)}this.value=newListener;this._pendingValue=noChange}handleEvent(event){if(typeof this.value==="function"){this.value.call(this.eventContext||this.element,event)}else{this.value.handleEvent(event)}}}const getOptions=o=>o&&(eventOptionsSupported?{capture:o.capture,passive:o.passive,once:o.once}:o.capture);class DefaultTemplateProcessor{handleAttributeExpressions(element,name,strings,options){const prefix=name[0];if(prefix==="."){const comitter=new PropertyCommitter(element,name.slice(1),strings);return comitter.parts}if(prefix==="@"){return[new EventPart(element,name.slice(1),options.eventContext)]}if(prefix==="?"){return[new BooleanAttributePart(element,name.slice(1),strings)]}const comitter=new AttributeCommitter(element,name,strings);return comitter.parts}handleTextExpression(options){return new NodePart(options)}}const defaultTemplateProcessor=new DefaultTemplateProcessor;function templateFactory(result){let templateCache=templateCaches.get(result.type);if(templateCache===undefined){templateCache={stringsArray:new WeakMap,keyString:new Map};templateCaches.set(result.type,templateCache)}let template=templateCache.stringsArray.get(result.strings);if(template!==undefined){return template}const key=result.strings.join(marker);template=templateCache.keyString.get(key);if(template===undefined){template=new Template(result,result.getTemplateElement());templateCache.keyString.set(key,template)}templateCache.stringsArray.set(result.strings,template);return template}const templateCaches=new Map;const parts=new WeakMap;const render=(result,container,options)=>{let part=parts.get(container);if(part===undefined){removeNodes(container,container.firstChild);parts.set(container,part=new NodePart(Object.assign({templateFactory:templateFactory},options)));part.appendInto(container)}part.setValue(result);part.commit()};const html=(strings,...values)=>new TemplateResult(strings,values,"html",defaultTemplateProcessor);const walkerNodeFilter=NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_COMMENT|NodeFilter.SHOW_TEXT;function removeNodesFromTemplate(template,nodesToRemove){const{element:{content:content},parts:parts}=template;const walker=document.createTreeWalker(content,walkerNodeFilter,null,false);let partIndex=nextActiveIndexInTemplateParts(parts);let part=parts[partIndex];let nodeIndex=-1;let removeCount=0;const nodesToRemoveInTemplate=[];let currentRemovingNode=null;while(walker.nextNode()){nodeIndex++;const node=walker.currentNode;if(node.previousSibling===currentRemovingNode){currentRemovingNode=null}if(nodesToRemove.has(node)){nodesToRemoveInTemplate.push(node);if(currentRemovingNode===null){currentRemovingNode=node}}if(currentRemovingNode!==null){removeCount++}while(part!==undefined&&part.index===nodeIndex){part.index=currentRemovingNode!==null?-1:part.index-removeCount;partIndex=nextActiveIndexInTemplateParts(parts,partIndex);part=parts[partIndex]}}nodesToRemoveInTemplate.forEach(n=>n.parentNode.removeChild(n))}const countNodes=node=>{let count=node.nodeType===Node.DOCUMENT_FRAGMENT_NODE?0:1;const walker=document.createTreeWalker(node,walkerNodeFilter,null,false);while(walker.nextNode()){count++}return count};const nextActiveIndexInTemplateParts=(parts,startIndex=-1)=>{for(let i=startIndex+1;i<parts.length;i++){const part=parts[i];if(isTemplatePartActive(part)){return i}}return-1};function insertNodeIntoTemplate(template,node,refNode=null){const{element:{content:content},parts:parts}=template;if(refNode===null||refNode===undefined){content.appendChild(node);return}const walker=document.createTreeWalker(content,walkerNodeFilter,null,false);let partIndex=nextActiveIndexInTemplateParts(parts);let insertCount=0;let walkerIndex=-1;while(walker.nextNode()){walkerIndex++;const walkerNode=walker.currentNode;if(walkerNode===refNode){insertCount=countNodes(node);refNode.parentNode.insertBefore(node,refNode)}while(partIndex!==-1&&parts[partIndex].index===walkerIndex){if(insertCount>0){while(partIndex!==-1){parts[partIndex].index+=insertCount;partIndex=nextActiveIndexInTemplateParts(parts,partIndex)}return}partIndex=nextActiveIndexInTemplateParts(parts,partIndex)}}}const getTemplateCacheKey=(type,scopeName)=>`${type}--${scopeName}`;let compatibleShadyCSSVersion=true;if(typeof window.ShadyCSS==="undefined"){compatibleShadyCSSVersion=false}else if(typeof window.ShadyCSS.prepareTemplateDom==="undefined"){console.warn(`Incompatible ShadyCSS version detected.`+`Please update to at least @webcomponents/webcomponentsjs@2.0.2 and`+`@webcomponents/shadycss@1.3.1.`);compatibleShadyCSSVersion=false}const shadyTemplateFactory=scopeName=>result=>{const cacheKey=getTemplateCacheKey(result.type,scopeName);let templateCache=templateCaches.get(cacheKey);if(templateCache===undefined){templateCache={stringsArray:new WeakMap,keyString:new Map};templateCaches.set(cacheKey,templateCache)}let template=templateCache.stringsArray.get(result.strings);if(template!==undefined){return template}const key=result.strings.join(marker);template=templateCache.keyString.get(key);if(template===undefined){const element=result.getTemplateElement();if(compatibleShadyCSSVersion){window.ShadyCSS.prepareTemplateDom(element,scopeName)}template=new Template(result,element);templateCache.keyString.set(key,template)}templateCache.stringsArray.set(result.strings,template);return template};const TEMPLATE_TYPES=["html","svg"];const removeStylesFromLitTemplates=scopeName=>{TEMPLATE_TYPES.forEach(type=>{const templates=templateCaches.get(getTemplateCacheKey(type,scopeName));if(templates!==undefined){templates.keyString.forEach(template=>{const{element:{content:content}}=template;const styles=new Set;Array.from(content.querySelectorAll("style")).forEach(s=>{styles.add(s)});removeNodesFromTemplate(template,styles)})}})};const shadyRenderSet=new Set;const prepareTemplateStyles=(renderedDOM,template,scopeName)=>{shadyRenderSet.add(scopeName);const styles=renderedDOM.querySelectorAll("style");if(styles.length===0){return}const condensedStyle=document.createElement("style");for(let i=0;i<styles.length;i++){const style=styles[i];style.parentNode.removeChild(style);condensedStyle.textContent+=style.textContent}removeStylesFromLitTemplates(scopeName);insertNodeIntoTemplate(template,condensedStyle,template.element.content.firstChild);window.ShadyCSS.prepareTemplateStyles(template.element,scopeName);if(window.ShadyCSS.nativeShadow){const style=template.element.content.querySelector("style");renderedDOM.insertBefore(style.cloneNode(true),renderedDOM.firstChild)}else{template.element.content.insertBefore(condensedStyle,template.element.content.firstChild);const removes=new Set;removes.add(condensedStyle);removeNodesFromTemplate(template,removes)}};const render$1=(result,container,options)=>{const scopeName=options.scopeName;const hasRendered=parts.has(container);const needsScoping=container instanceof ShadowRoot&&compatibleShadyCSSVersion&&result instanceof TemplateResult;const firstScopeRender=needsScoping&&!shadyRenderSet.has(scopeName);const renderContainer=firstScopeRender?document.createDocumentFragment():container;render(result,renderContainer,Object.assign({templateFactory:shadyTemplateFactory(scopeName)},options));if(firstScopeRender){const part=parts.get(renderContainer);parts.delete(renderContainer);if(part.value instanceof TemplateInstance){prepareTemplateStyles(renderContainer,part.value.template,scopeName)}removeNodes(container,container.firstChild);container.appendChild(renderContainer);parts.set(container,part)}if(!hasRendered&&needsScoping){window.ShadyCSS.styleElement(container.host)}};const fromBooleanAttribute=value=>value!==null;const toBooleanAttribute=value=>value?"":null;const notEqual=(value,old)=>{return old!==value&&(old===old||value===value)};const defaultPropertyDeclaration={attribute:true,type:String,reflect:false,hasChanged:notEqual};const microtaskPromise=new Promise(resolve=>resolve(true));const STATE_HAS_UPDATED=1;const STATE_UPDATE_REQUESTED=1<<2;const STATE_IS_REFLECTING=1<<3;class UpdatingElement extends HTMLElement{constructor(){super();this._updateState=0;this._instanceProperties=undefined;this._updatePromise=microtaskPromise;this._changedProperties=new Map;this._reflectingProperties=undefined;this.initialize()}static get observedAttributes(){this._finalize();const attributes=[];for(const[p,v]of this._classProperties){const attr=this._attributeNameForProperty(p,v);if(attr!==undefined){this._attributeToPropertyMap.set(attr,p);attributes.push(attr)}}return attributes}static createProperty(name,options=defaultPropertyDeclaration){if(!this.hasOwnProperty("_classProperties")){this._classProperties=new Map;const superProperties=Object.getPrototypeOf(this)._classProperties;if(superProperties!==undefined){superProperties.forEach((v,k)=>this._classProperties.set(k,v))}}this._classProperties.set(name,options);if(this.prototype.hasOwnProperty(name)){return}const key=typeof name==="symbol"?Symbol():`__${name}`;Object.defineProperty(this.prototype,name,{get(){return this[key]},set(value){const oldValue=this[name];this[key]=value;this._requestPropertyUpdate(name,oldValue,options)},configurable:true,enumerable:true})}static _finalize(){if(this.hasOwnProperty("_finalized")&&this._finalized){return}const superCtor=Object.getPrototypeOf(this);if(typeof superCtor._finalize==="function"){superCtor._finalize()}this._finalized=true;this._attributeToPropertyMap=new Map;const props=this.properties;const propKeys=[...Object.getOwnPropertyNames(props),...typeof Object.getOwnPropertySymbols==="function"?Object.getOwnPropertySymbols(props):[]];for(const p of propKeys){this.createProperty(p,props[p])}}static _attributeNameForProperty(name,options){const attribute=options!==undefined&&options.attribute;return attribute===false?undefined:typeof attribute==="string"?attribute:typeof name==="string"?name.toLowerCase():undefined}static _valueHasChanged(value,old,hasChanged=notEqual){return hasChanged(value,old)}static _propertyValueFromAttribute(value,options){const type=options&&options.type;if(type===undefined){return value}const fromAttribute=type===Boolean?fromBooleanAttribute:typeof type==="function"?type:type.fromAttribute;return fromAttribute?fromAttribute(value):value}static _propertyValueToAttribute(value,options){if(options===undefined||options.reflect===undefined){return}const toAttribute=options.type===Boolean?toBooleanAttribute:options.type&&options.type.toAttribute||String;return toAttribute(value)}initialize(){this.renderRoot=this.createRenderRoot();this._saveInstanceProperties()}_saveInstanceProperties(){for(const[p]of this.constructor._classProperties){if(this.hasOwnProperty(p)){const value=this[p];delete this[p];if(!this._instanceProperties){this._instanceProperties=new Map}this._instanceProperties.set(p,value)}}}_applyInstanceProperties(){for(const[p,v]of this._instanceProperties){this[p]=v}this._instanceProperties=undefined}createRenderRoot(){return this.attachShadow({mode:"open"})}connectedCallback(){if(this._updateState&STATE_HAS_UPDATED){if(window.ShadyCSS!==undefined){window.ShadyCSS.styleElement(this)}}else{this.requestUpdate()}}disconnectedCallback(){}attributeChangedCallback(name,old,value){if(old!==value){this._attributeToProperty(name,value)}}_propertyToAttribute(name,value,options=defaultPropertyDeclaration){const ctor=this.constructor;const attrValue=ctor._propertyValueToAttribute(value,options);if(attrValue!==undefined){const attr=ctor._attributeNameForProperty(name,options);if(attr!==undefined){this._updateState=this._updateState|STATE_IS_REFLECTING;if(attrValue===null){this.removeAttribute(attr)}else{this.setAttribute(attr,attrValue)}this._updateState=this._updateState&~STATE_IS_REFLECTING}}}_attributeToProperty(name,value){if(!(this._updateState&STATE_IS_REFLECTING)){const ctor=this.constructor;const propName=ctor._attributeToPropertyMap.get(name);if(propName!==undefined){const options=ctor._classProperties.get(propName);this[propName]=ctor._propertyValueFromAttribute(value,options)}}}requestUpdate(name,oldValue){if(name!==undefined){const options=this.constructor._classProperties.get(name)||defaultPropertyDeclaration;return this._requestPropertyUpdate(name,oldValue,options)}return this._invalidate()}_requestPropertyUpdate(name,oldValue,options){if(!this.constructor._valueHasChanged(this[name],oldValue,options.hasChanged)){return this.updateComplete}if(!this._changedProperties.has(name)){this._changedProperties.set(name,oldValue)}if(options.reflect===true){if(this._reflectingProperties===undefined){this._reflectingProperties=new Map}this._reflectingProperties.set(name,options)}return this._invalidate()}async _invalidate(){if(!this._hasRequestedUpdate){this._updateState=this._updateState|STATE_UPDATE_REQUESTED;let resolver;const previousValidatePromise=this._updatePromise;this._updatePromise=new Promise(r=>resolver=r);await previousValidatePromise;this._validate();resolver(!this._hasRequestedUpdate)}return this.updateComplete}get _hasRequestedUpdate(){return this._updateState&STATE_UPDATE_REQUESTED}_validate(){if(this._instanceProperties){this._applyInstanceProperties()}if(this.shouldUpdate(this._changedProperties)){const changedProperties=this._changedProperties;this.update(changedProperties);this._markUpdated();if(!(this._updateState&STATE_HAS_UPDATED)){this._updateState=this._updateState|STATE_HAS_UPDATED;this.firstUpdated(changedProperties)}this.updated(changedProperties)}else{this._markUpdated()}}_markUpdated(){this._changedProperties=new Map;this._updateState=this._updateState&~STATE_UPDATE_REQUESTED}get updateComplete(){return this._updatePromise}shouldUpdate(_changedProperties){return true}update(_changedProperties){if(this._reflectingProperties!==undefined&&this._reflectingProperties.size>0){for(const[k,v]of this._reflectingProperties){this._propertyToAttribute(k,this[k],v)}this._reflectingProperties=undefined}}updated(_changedProperties){}firstUpdated(_changedProperties){}}UpdatingElement._attributeToPropertyMap=new Map;UpdatingElement._finalized=true;UpdatingElement._classProperties=new Map;UpdatingElement.properties={};class LitElement extends UpdatingElement{update(changedProperties){super.update(changedProperties);const templateResult=this.render();if(templateResult instanceof TemplateResult){this.constructor.render(templateResult,this.renderRoot,{scopeName:this.localName,eventContext:this})}}render(){}}LitElement.render=render$1;const createAndInsertPart=(containerPart,beforePart)=>{const container=containerPart.startNode.parentNode;const beforeNode=beforePart===undefined?containerPart.endNode:beforePart.startNode;const startNode=container.insertBefore(createMarker(),beforeNode);container.insertBefore(createMarker(),beforeNode);const newPart=new NodePart(containerPart.options);newPart.insertAfterNode(startNode);return newPart};const updatePart=(part,value)=>{part.setValue(value);part.commit();return part};const insertPartBefore=(containerPart,part,ref)=>{const container=containerPart.startNode.parentNode;const beforeNode=ref?ref.startNode:containerPart.endNode;const endNode=part.endNode.nextSibling;if(endNode!==beforeNode){reparentNodes(container,part.startNode,endNode,beforeNode)}};const removePart=part=>{removeNodes(part.startNode.parentNode,part.startNode,part.endNode.nextSibling)};const generateMap=(list,start,end)=>{const map=new Map;for(let i=start;i<=end;i++){map.set(list[i],i)}return map};const partListCache=new WeakMap;const keyListCache=new WeakMap;const repeat=directive((items,keyFnOrTemplate,template)=>{let keyFn;if(template===undefined){template=keyFnOrTemplate}else if(keyFnOrTemplate!==undefined){keyFn=keyFnOrTemplate}return containerPart=>{if(!(containerPart instanceof NodePart)){throw new Error("repeat can only be used in text bindings")}const oldParts=partListCache.get(containerPart)||[];const oldKeys=keyListCache.get(containerPart)||[];const newParts=[];const newValues=[];const newKeys=[];let index=0;for(const item of items){newKeys[index]=keyFn?keyFn(item,index):index;newValues[index]=template(item,index);index++}let newKeyToIndexMap;let oldKeyToIndexMap;let oldHead=0;let oldTail=oldParts.length-1;let newHead=0;let newTail=newValues.length-1;while(oldHead<=oldTail&&newHead<=newTail){if(oldParts[oldHead]===null){oldHead++}else if(oldParts[oldTail]===null){oldTail--}else if(oldKeys[oldHead]===newKeys[newHead]){newParts[newHead]=updatePart(oldParts[oldHead],newValues[newHead]);oldHead++;newHead++}else if(oldKeys[oldTail]===newKeys[newTail]){newParts[newTail]=updatePart(oldParts[oldTail],newValues[newTail]);oldTail--;newTail--}else if(oldKeys[oldHead]===newKeys[newTail]){newParts[newTail]=updatePart(oldParts[oldHead],newValues[newTail]);insertPartBefore(containerPart,oldParts[oldHead],newParts[newTail+1]);oldHead++;newTail--}else if(oldKeys[oldTail]===newKeys[newHead]){newParts[newHead]=updatePart(oldParts[oldTail],newValues[newHead]);insertPartBefore(containerPart,oldParts[oldTail],oldParts[oldHead]);oldTail--;newHead++}else{if(newKeyToIndexMap===undefined){newKeyToIndexMap=generateMap(newKeys,newHead,newTail);oldKeyToIndexMap=generateMap(oldKeys,oldHead,oldTail)}if(!newKeyToIndexMap.has(oldKeys[oldHead])){removePart(oldParts[oldHead]);oldHead++}else if(!newKeyToIndexMap.has(oldKeys[oldTail])){removePart(oldParts[oldTail]);oldTail--}else{const oldIndex=oldKeyToIndexMap.get(newKeys[newHead]);const oldPart=oldIndex!==undefined?oldParts[oldIndex]:null;if(oldPart===null){const newPart=createAndInsertPart(containerPart,oldParts[oldHead]);updatePart(newPart,newValues[newHead]);newParts[newHead]=newPart}else{newParts[newHead]=updatePart(oldPart,newValues[newHead]);insertPartBefore(containerPart,oldPart,oldParts[oldHead]);oldParts[oldIndex]=null}newHead++}}}while(newHead<=newTail){const newPart=createAndInsertPart(containerPart,newParts[newTail+1]);updatePart(newPart,newValues[newHead]);newParts[newHead++]=newPart}while(oldHead<=oldTail){const oldPart=oldParts[oldHead++];if(oldPart!==null){removePart(oldPart)}}partListCache.set(containerPart,newParts);keyListCache.set(containerPart,newKeys)}});class MyTodo extends LitElement{static get properties(){return{list:{type:Array}}}constructor(){super();this.list=[{id:0,text:"my initial todo",checked:false},{id:1,text:"Learn about Web Components",checked:true}]}render(){return html`
<style>
h1 {
    font-size: 100px;
    font-weight: 100;
    text-align: center;
    color: rgba(175, 47, 47, 0.15);
}

section {
    background: #fff;
    margin: 130px 0 40px 0;
    position: relative;
    box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 25px 50px 0 rgba(0, 0, 0, 0.1);
}

#list-container {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid #e6e6e6;
}
</style>
<h1>Todos WC</h1>
<section>
    <todo-input @submit=${this.addItem}></todo-input>
    <ul id="list-container">
        ${repeat(this.list,item=>item.id,(item,index)=>html`
                <todo-item 
                    .text="${item.text}" 
                    .checked="${item.checked}" 
                    .index="${index}" 
                    @removed=${this.removeItem}
                    @checked=${this.toggleItem}>
                </todo-item>`)}
    </ul>
</section>`}addItem(e){this.list.splice(e.detail,0,{id:this.list.length,text:e.detail,checked:false});this.requestUpdate()}removeItem(e){this.list.splice(e.detail,1);this.requestUpdate()}toggleItem(e){const item=this.list[e.detail];item.checked=!item.checked;this.requestUpdate()}}window.customElements.define("my-todo",MyTodo);class TodoInput extends LitElement{static get properties(){return{newtodo:{type:{}}}}render(){return html`
<style>
    #new-todo-form {
        position: relative;
        font-size: 24px;
        border-bottom: 1px solid #ededed;
    }

    #new-todo {
        padding: 16px 16px 16px 60px;
        border: none;
        background: rgba(0, 0, 0, 0.003);
        position: relative;
        margin: 0;
        width: 100%;
        font-size: 24px;
        font-family: inherit;
        font-weight: inherit;
        line-height: 1.4em;
        border: 0;
        outline: none;
        color: inherit;
        padding: 6px;
        border: 1px solid #CCC;
        box-shadow: inset 0 -1px 5px 0 rgba(0, 0, 0, 0.2);
        box-sizing: border-box;
    }
</style>
<form id="new-todo-form" @submit=${this.handleSubmit}>
    <input id="new-todo" type="text" placeholder="What needs to be done?" value="" @input=${this.handleInput}/>
</form>`}handleInput(e){this.newtodo=e.target.value}handleSubmit(e){e.preventDefault();this.dispatchEvent(new CustomEvent("submit",{detail:this.newtodo}));this.$input=this.shadowRoot.querySelector("#new-todo");this.$input.value="";this.$input.blur()}}window.customElements.define("todo-input",TodoInput);class TodoItem extends LitElement{static get properties(){return{checked:{type:Boolean},index:{type:Number},text:{}}}constructor(){super();this.checked=false;this.text="";this.index=0}render(){const{checked:checked,text:text}=this;return html`
<style>
    :host {
        display: block;
    }

    li.item {
        font-size: 24px;
        display: block;
        position: relative;
        border-bottom: 1px solid #ededed;
    }

    li.item input {
        text-align: center;
        width: 40px;
        /* auto, since non-WebKit browsers doesn't support input styling */
        height: auto;
        position: absolute;
        top: 9px;
        bottom: 0;
        margin: auto 0;
        border: none;
        /* Mobile Safari */
        -webkit-appearance: none;
        appearance: none;
    }

    li.item input:after {
        content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="-10 -18 100 135"><circle cx="50" cy="50" r="50" fill="none" stroke="#ededed" stroke-width="3"/></svg>');
    }

    li.item input:checked:after {
        content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="-10 -18 100 135"><circle cx="50" cy="50" r="50" fill="none" stroke="#bddad5" stroke-width="3"/><path fill="#5dc2af" d="M72 25L42 71 27 56l-4 4 20 20 34-52z"/></svg>');
    }

    li.item label {
        white-space: pre;
        word-break: break-word;
        padding: 15px 60px 15px 15px;
        margin-left: 45px;
        display: block;
        line-height: 1.2;
        transition: color 0.4s;
    }

    li.item.completed label {
        color: #d9d9d9;
        text-decoration: line-through;
    }

    li.item button,
        li.item input[type="checkbox"] {
        outline: none;
    }

    li.item button {
        margin: 0;
        padding: 0;
        border: 0;
        background: none;
        font-size: 100%;
        vertical-align: baseline;
        font-family: inherit;
        font-weight: inherit;
        color: inherit;
        -webkit-appearance: none;
        appearance: none;
        -webkit-font-smoothing: antialiased;
        -moz-font-smoothing: antialiased;
        font-smoothing: antialiased;
    }

    li.item .destroy {
        position: absolute;
        top: 0;
        right: 10px;
        bottom: 0;
        width: 40px;
        height: 40px;
        margin: auto 0;
        font-size: 30px;
        color: #cc9a9a;
        margin-bottom: 11px;
        transition: color 0.2s ease-out;
    }

    li.item .destroy:hover {
        color: #af5b5e;
    }
</style>
<li class="item ${checked?"completed":""})}">
    <input type="checkbox" .checked=${checked} @change=${this.handleOnChecked}>
    <label>${text}</label>
    <button class="destroy" @click=${this.handleOnRemoved}>x</button>
</li>`}handleOnRemoved(e){this.dispatchEvent(new CustomEvent("removed",{detail:this.index}))}handleOnChecked(e){this.dispatchEvent(new CustomEvent("checked",{detail:this.index}))}}window.customElements.define("todo-item",TodoItem);