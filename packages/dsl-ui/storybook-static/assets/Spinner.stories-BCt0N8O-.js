import{j as e}from"./jsx-runtime-D_zvdyIk.js";const C={sm:16,md:24,lg:40};function s({size:w="md",label:b="Loading..."}){const i=C[w];return e.jsxs("svg",{role:"status","aria-label":b,className:"animate-spin text-primary",width:i,height:i,viewBox:"0 0 24 24",fill:"none",xmlns:"http://www.w3.org/2000/svg",children:[e.jsx("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),e.jsx("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"})]})}s.__docgenInfo={description:`@registryCategory atomic
@registryTags loading spinner`,methods:[],displayName:"Spinner",props:{size:{required:!1,tsType:{name:"union",raw:"'sm' | 'md' | 'lg'",elements:[{name:"literal",value:"'sm'"},{name:"literal",value:"'md'"},{name:"literal",value:"'lg'"}]},description:"",defaultValue:{value:"'md'",computed:!1}},label:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'Loading...'",computed:!1}}}};const N={title:"Display/Spinner",component:s,parameters:{layout:"centered"},argTypes:{size:{control:"radio",options:["sm","md","lg"]}}},r={args:{size:"sm"}},a={args:{size:"md"}},n={args:{size:"lg"}},t={args:{size:"md",label:"Fetching data..."}},o={render:()=>e.jsxs("div",{className:"flex items-center gap-6",children:[e.jsx(s,{size:"sm"}),e.jsx(s,{size:"md"}),e.jsx(s,{size:"lg"})]})},_=["Small","Medium","Large","CustomLabel","AllSizes"];var l,m,c;r.parameters={...r.parameters,docs:{...(l=r.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    size: 'sm'
  }
}`,...(c=(m=r.parameters)==null?void 0:m.docs)==null?void 0:c.source}}};var d,p,g;a.parameters={...a.parameters,docs:{...(d=a.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    size: 'md'
  }
}`,...(g=(p=a.parameters)==null?void 0:p.docs)==null?void 0:g.source}}};var u,z,x;n.parameters={...n.parameters,docs:{...(u=n.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    size: 'lg'
  }
}`,...(x=(z=n.parameters)==null?void 0:z.docs)==null?void 0:x.source}}};var S,f,y;t.parameters={...t.parameters,docs:{...(S=t.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    size: 'md',
    label: 'Fetching data...'
  }
}`,...(y=(f=t.parameters)==null?void 0:f.docs)==null?void 0:y.source}}};var h,v,j;o.parameters={...o.parameters,docs:{...(h=o.parameters)==null?void 0:h.docs,source:{originalSource:`{
  render: () => <div className="flex items-center gap-6">\r
            <Spinner size="sm" />\r
            <Spinner size="md" />\r
            <Spinner size="lg" />\r
        </div>
}`,...(j=(v=o.parameters)==null?void 0:v.docs)==null?void 0:j.source}}};export{o as AllSizes,t as CustomLabel,n as Large,a as Medium,r as Small,_ as __namedExportsOrder,N as default};
