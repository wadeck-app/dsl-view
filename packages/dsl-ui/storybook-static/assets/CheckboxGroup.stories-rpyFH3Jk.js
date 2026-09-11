import{j as r}from"./jsx-runtime-D_zvdyIk.js";import{R as _,r as d}from"./iframe-C8SDnYAp.js";import"./preload-helper-Dp1pzeXC.js";const k=_.forwardRef(function({className:e,...a},o){return r.jsx("input",{ref:o,type:"checkbox",className:`h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary${e?` ${e}`:""}`,...a})});k.__docgenInfo={description:`@registryCategory atomic
@registryTags checkbox field`,methods:[],displayName:"Checkbox",composes:["Omit"]};const E="text-sm font-medium text-content mb-2",V="flex items-center gap-2 text-sm text-content cursor-pointer",G="flex items-center gap-2 text-sm text-content opacity-50 cursor-not-allowed",T={vertical:"flex flex-col gap-2",horizontal:"flex flex-row flex-wrap gap-4"};function n({options:t,value:e,onChange:a,label:o,orientation:j="vertical"}){function L(s){e.includes(s)?a(e.filter(A=>A!==s)):a([...e,s])}return r.jsxs("fieldset",{className:"border-0 p-0 m-0",children:[o&&r.jsx("legend",{className:E,children:o}),r.jsx("div",{className:T[j],children:t.map(s=>r.jsxs("label",{className:s.disabled?G:V,children:[r.jsx(k,{checked:e.includes(s.value),onChange:()=>!s.disabled&&L(s.value),disabled:s.disabled,className:"!h-4 !w-4"}),s.label]},s.value))})]})}n.__docgenInfo={description:`@registryCategory atomic
@registryTags checkbox group field
@registryBind formData onChange`,methods:[],displayName:"CheckboxGroup",props:{options:{required:!0,tsType:{name:"Array",elements:[{name:"CheckboxOption"}],raw:"CheckboxOption[]"},description:""},value:{required:!0,tsType:{name:"Array",elements:[{name:"string"}],raw:"string[]"},description:""},onChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(value: string[]) => void",signature:{arguments:[{type:{name:"Array",elements:[{name:"string"}],raw:"string[]"},name:"value"}],return:{name:"void"}}},description:""},label:{required:!1,tsType:{name:"string"},description:""},orientation:{required:!1,tsType:{name:"union",raw:"'vertical' | 'horizontal'",elements:[{name:"literal",value:"'vertical'"},{name:"literal",value:"'horizontal'"}]},description:"",defaultValue:{value:"'vertical'",computed:!1}}}};const P={title:"Controls/CheckboxGroup",component:n,parameters:{layout:"centered"}},m=[{value:"read",label:"Read"},{value:"write",label:"Write"},{value:"delete",label:"Delete",disabled:!0}],i={render:t=>{const[e,a]=d.useState([]);return r.jsx("div",{className:"w-48",children:r.jsx(n,{...t,value:e,onChange:a})})},args:{options:m,orientation:"vertical"}},l={render:t=>{const[e,a]=d.useState([]);return r.jsx("div",{className:"w-48",children:r.jsx(n,{...t,value:e,onChange:a})})},args:{options:m,orientation:"horizontal"}},c={render:t=>{const[e,a]=d.useState([]);return r.jsx("div",{className:"w-48",children:r.jsx(n,{...t,value:e,onChange:a})})},args:{options:m,label:"Permissions",orientation:"vertical"}},u={render:t=>{const[e,a]=d.useState(["read"]);return r.jsx("div",{className:"w-48",children:r.jsx(n,{...t,value:e,onChange:a})})},args:{options:m,label:"Permissions"}},R=["Default","Horizontal","WithGroupLabel","PartiallyChecked"];var p,g,v;i.parameters={...i.parameters,docs:{...(p=i.parameters)==null?void 0:p.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<string[]>([]);
    return <div className="w-48"><CheckboxGroup {...args} value={value} onChange={setValue} /></div>;
  },
  args: {
    options,
    orientation: 'vertical'
  }
}`,...(v=(g=i.parameters)==null?void 0:g.docs)==null?void 0:v.source}}};var x,h,b;l.parameters={...l.parameters,docs:{...(x=l.parameters)==null?void 0:x.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<string[]>([]);
    return <div className="w-48"><CheckboxGroup {...args} value={value} onChange={setValue} /></div>;
  },
  args: {
    options,
    orientation: 'horizontal'
  }
}`,...(b=(h=l.parameters)==null?void 0:h.docs)==null?void 0:b.source}}};var f,C,y;c.parameters={...c.parameters,docs:{...(f=c.parameters)==null?void 0:f.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<string[]>([]);
    return <div className="w-48"><CheckboxGroup {...args} value={value} onChange={setValue} /></div>;
  },
  args: {
    options,
    label: 'Permissions',
    orientation: 'vertical'
  }
}`,...(y=(C=c.parameters)==null?void 0:C.docs)==null?void 0:y.source}}};var S,w,N;u.parameters={...u.parameters,docs:{...(S=u.parameters)==null?void 0:S.docs,source:{originalSource:`{
  render: args => {
    const [value, setValue] = useState<string[]>(['read']);
    return <div className="w-48"><CheckboxGroup {...args} value={value} onChange={setValue} /></div>;
  },
  args: {
    options,
    label: 'Permissions'
  }
}`,...(N=(w=u.parameters)==null?void 0:w.docs)==null?void 0:N.source}}};export{i as Default,l as Horizontal,u as PartiallyChecked,c as WithGroupLabel,R as __namedExportsOrder,P as default};
