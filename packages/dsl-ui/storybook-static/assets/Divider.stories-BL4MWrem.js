import{j as r}from"./jsx-runtime-D_zvdyIk.js";import{r as S}from"./iframe-C8SDnYAp.js";import{P as T}from"./index-twabaTmL.js";import"./preload-helper-Dp1pzeXC.js";import"./index-EVyiSfz9.js";import"./index-BZzt7Uss.js";var _=Object.defineProperty,y=(e,a)=>_(e,"name",{value:a,configurable:!0}),c="horizontal",w=["horizontal","vertical"],I=S.forwardRef(y(function(a,t){const{decorative:z,orientation:d=c,...N}=a,l=j(d)?d:c,R=z?{role:"none"}:{"aria-orientation":l==="vertical"?l:void 0,role:"separator"};return r.jsx(T.div,{"data-orientation":l,...R,...N,ref:t})},"Separator"));function j(e){return w.includes(e)}y(j,"isValidOrientation");var o=I;function O({orientation:e="horizontal",label:a,className:t=""}){return e==="vertical"?r.jsx(o,{orientation:"vertical",className:`border-l border-border self-stretch ${t}`}):a?r.jsxs("div",{className:`flex items-center gap-2 w-full ${t}`,children:[r.jsx(o,{className:"flex-1 border-t border-border"}),r.jsx("span",{className:"text-xs text-muted px-2 whitespace-nowrap",children:a}),r.jsx(o,{className:"flex-1 border-t border-border"})]}):r.jsx(o,{className:`border-t border-border w-full ${t}`})}O.__docgenInfo={description:`@registryCategory atomic
@registryTags divider separator line`,methods:[],displayName:"Divider",props:{orientation:{required:!1,tsType:{name:"union",raw:"'horizontal' | 'vertical'",elements:[{name:"literal",value:"'horizontal'"},{name:"literal",value:"'vertical'"}]},description:"",defaultValue:{value:"'horizontal'",computed:!1}},label:{required:!1,tsType:{name:"string"},description:""},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}}}};const A={title:"Layout/Divider",component:O,parameters:{layout:"padded"},decorators:[e=>r.jsx("div",{style:{width:300,padding:16},children:r.jsx(e,{})})]},i={args:{}},s={args:{label:"OR"}},n={args:{orientation:"vertical"},decorators:[e=>r.jsxs("div",{style:{display:"flex",height:40,alignItems:"center",gap:8},children:[r.jsx("span",{children:"Left"}),r.jsx(e,{}),r.jsx("span",{children:"Right"})]})]},$=["Horizontal","HorizontalWithLabel","Vertical"];var p,m,u;i.parameters={...i.parameters,docs:{...(p=i.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {}
}`,...(u=(m=i.parameters)==null?void 0:m.docs)==null?void 0:u.source}}};var f,v,g;s.parameters={...s.parameters,docs:{...(f=s.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    label: 'OR'
  }
}`,...(g=(v=s.parameters)==null?void 0:v.docs)==null?void 0:g.source}}};var x,h,b;n.parameters={...n.parameters,docs:{...(x=n.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    orientation: 'vertical'
  },
  decorators: [Story => <div style={{
    display: 'flex',
    height: 40,
    alignItems: 'center',
    gap: 8
  }}><span>Left</span><Story /><span>Right</span></div>]
}`,...(b=(h=n.parameters)==null?void 0:h.docs)==null?void 0:b.source}}};export{i as Horizontal,s as HorizontalWithLabel,n as Vertical,$ as __namedExportsOrder,A as default};
