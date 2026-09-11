import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{c as k}from"./createLucideIcon-DaIa_YUY.js";import"./iframe-C8SDnYAp.js";import"./preload-helper-Dp1pzeXC.js";/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],L=k("x",G),O="ml-0.5 rounded-full hover:opacity-70 focus:outline-none focus:ring-1 focus:ring-current",q={default:"bg-muted-bg text-muted",blue:"bg-blue-100 text-blue-800",green:"bg-green-100 text-green-800",red:"bg-red-100 text-red-800",yellow:"bg-yellow-100 text-yellow-800",purple:"bg-purple-100 text-purple-800"};function r({label:u,color:E="default",onRemove:p}){return e.jsxs("span",{className:`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${q[E]}`,children:[u,p&&e.jsx("button",{type:"button",onClick:p,"aria-label":`Remove ${u}`,className:O,children:e.jsx(L,{size:10})})]})}r.__docgenInfo={description:`@registryCategory atomic
@registryTags tag chip label`,methods:[],displayName:"Tag",props:{label:{required:!0,tsType:{name:"string"},description:""},color:{required:!1,tsType:{name:"union",raw:"'default' | 'blue' | 'green' | 'red' | 'yellow' | 'purple'",elements:[{name:"literal",value:"'default'"},{name:"literal",value:"'blue'"},{name:"literal",value:"'green'"},{name:"literal",value:"'red'"},{name:"literal",value:"'yellow'"},{name:"literal",value:"'purple'"}]},description:"",defaultValue:{value:"'default'",computed:!1}},onRemove:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};const Y={title:"Display/Tag",component:r,parameters:{layout:"centered"},argTypes:{color:{control:"select",options:["default","blue","green","red","yellow","purple"]}}},l={args:{label:"Tag"}},a={args:{label:"TypeScript",color:"blue"}},o={args:{label:"Active",color:"green"}},s={args:{label:"Deprecated",color:"red"}},n={args:{label:"React",color:"blue",onRemove:()=>{}}},t={render:()=>e.jsxs("div",{className:"flex flex-wrap gap-2",children:[e.jsx(r,{label:"Default",color:"default"}),e.jsx(r,{label:"Blue",color:"blue"}),e.jsx(r,{label:"Green",color:"green"}),e.jsx(r,{label:"Red",color:"red"}),e.jsx(r,{label:"Yellow",color:"yellow"}),e.jsx(r,{label:"Purple",color:"purple"})]})},c={render:()=>e.jsxs("div",{className:"flex flex-wrap gap-2",children:[e.jsx(r,{label:"React",color:"blue",onRemove:()=>{}}),e.jsx(r,{label:"TypeScript",color:"purple",onRemove:()=>{}}),e.jsx(r,{label:"Tailwind",color:"green",onRemove:()=>{}})]})},$=["Default","Blue","Green","Red","Removable","AllColors","RemovableTags"];var d,i,m;l.parameters={...l.parameters,docs:{...(d=l.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    label: 'Tag'
  }
}`,...(m=(i=l.parameters)==null?void 0:i.docs)==null?void 0:m.source}}};var g,b,f;a.parameters={...a.parameters,docs:{...(g=a.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    label: 'TypeScript',
    color: 'blue'
  }
}`,...(f=(b=a.parameters)==null?void 0:b.docs)==null?void 0:f.source}}};var x,v,y;o.parameters={...o.parameters,docs:{...(x=o.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    label: 'Active',
    color: 'green'
  }
}`,...(y=(v=o.parameters)==null?void 0:v.docs)==null?void 0:y.source}}};var T,R,w;s.parameters={...s.parameters,docs:{...(T=s.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    label: 'Deprecated',
    color: 'red'
  }
}`,...(w=(R=s.parameters)==null?void 0:R.docs)==null?void 0:w.source}}};var j,S,h;n.parameters={...n.parameters,docs:{...(j=n.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    label: 'React',
    color: 'blue',
    onRemove: () => {}
  }
}`,...(h=(S=n.parameters)==null?void 0:S.docs)==null?void 0:h.source}}};var N,_,C;t.parameters={...t.parameters,docs:{...(N=t.parameters)==null?void 0:N.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-2">\r
            <Tag label="Default" color="default" />\r
            <Tag label="Blue" color="blue" />\r
            <Tag label="Green" color="green" />\r
            <Tag label="Red" color="red" />\r
            <Tag label="Yellow" color="yellow" />\r
            <Tag label="Purple" color="purple" />\r
        </div>
}`,...(C=(_=t.parameters)==null?void 0:_.docs)==null?void 0:C.source}}};var D,A,B;c.parameters={...c.parameters,docs:{...(D=c.parameters)==null?void 0:D.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-2">\r
            <Tag label="React" color="blue" onRemove={() => {}} />\r
            <Tag label="TypeScript" color="purple" onRemove={() => {}} />\r
            <Tag label="Tailwind" color="green" onRemove={() => {}} />\r
        </div>
}`,...(B=(A=c.parameters)==null?void 0:A.docs)==null?void 0:B.source}}};export{t as AllColors,a as Blue,l as Default,o as Green,s as Red,n as Removable,c as RemovableTags,$ as __namedExportsOrder,Y as default};
