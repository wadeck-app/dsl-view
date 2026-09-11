import{j as e}from"./jsx-runtime-D_zvdyIk.js";function r({width:l="100%",height:C="1rem",variant:L="line",count:d=1}){const o=L==="circle",c=o?l:C,T=e.jsx("div",{className:`animate-pulse bg-gray-200 dark:bg-gray-700 ${o?"rounded-full":"rounded"}`,style:{width:l,height:c}});return d<=1?e.jsx("div",{role:"status","aria-label":"Loading",children:T}):e.jsx("div",{role:"status","aria-label":"Loading",className:"flex flex-col gap-2",children:Array.from({length:d}).map((q,_)=>e.jsx("div",{className:`animate-pulse bg-gray-200 dark:bg-gray-700 ${o?"rounded-full":"rounded"}`,style:{width:l,height:c}},_))})}r.__docgenInfo={description:`@registryCategory atomic
@registryTags skeleton loading placeholder`,methods:[],displayName:"Skeleton",props:{width:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'100%'",computed:!1}},height:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'1rem'",computed:!1}},variant:{required:!1,tsType:{name:"union",raw:"'line' | 'circle' | 'block'",elements:[{name:"literal",value:"'line'"},{name:"literal",value:"'circle'"},{name:"literal",value:"'block'"}]},description:"",defaultValue:{value:"'line'",computed:!1}},count:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"1",computed:!1}}}};const B={title:"Display/Skeleton",component:r,parameters:{layout:"padded"}},a={args:{variant:"line",width:"300px",height:"1rem"}},t={args:{variant:"circle",width:"48px"}},n={args:{variant:"block",width:"300px",height:"120px"}},i={args:{variant:"line",width:"100%",count:3}},s={render:()=>e.jsxs("div",{className:"flex flex-col gap-3 w-64 p-4 border border-border rounded-lg",children:[e.jsx(r,{variant:"line",width:"60%",height:"1.25rem"}),e.jsx(r,{variant:"line",width:"100%",count:3}),e.jsxs("div",{className:"flex gap-2 items-center",children:[e.jsx(r,{variant:"circle",width:"32px"}),e.jsx(r,{variant:"line",width:"120px",height:"0.75rem"})]})]})},E=["Line","Circle","Block","MultiLine","CardPlaceholder"];var p,m,u;a.parameters={...a.parameters,docs:{...(p=a.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    variant: 'line',
    width: '300px',
    height: '1rem'
  }
}`,...(u=(m=a.parameters)==null?void 0:m.docs)==null?void 0:u.source}}};var g,h,v;t.parameters={...t.parameters,docs:{...(g=t.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    variant: 'circle',
    width: '48px'
  }
}`,...(v=(h=t.parameters)==null?void 0:h.docs)==null?void 0:v.source}}};var x,f,w;n.parameters={...n.parameters,docs:{...(x=n.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    variant: 'block',
    width: '300px',
    height: '120px'
  }
}`,...(w=(f=n.parameters)==null?void 0:f.docs)==null?void 0:w.source}}};var b,y,k;i.parameters={...i.parameters,docs:{...(b=i.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    variant: 'line',
    width: '100%',
    count: 3
  }
}`,...(k=(y=i.parameters)==null?void 0:y.docs)==null?void 0:k.source}}};var j,S,N;s.parameters={...s.parameters,docs:{...(j=s.parameters)==null?void 0:j.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-3 w-64 p-4 border border-border rounded-lg">\r
            <Skeleton variant="line" width="60%" height="1.25rem" />\r
            <Skeleton variant="line" width="100%" count={3} />\r
            <div className="flex gap-2 items-center">\r
                <Skeleton variant="circle" width="32px" />\r
                <Skeleton variant="line" width="120px" height="0.75rem" />\r
            </div>\r
        </div>
}`,...(N=(S=s.parameters)==null?void 0:S.docs)==null?void 0:N.source}}};export{n as Block,s as CardPlaceholder,t as Circle,a as Line,i as MultiLine,E as __namedExportsOrder,B as default};
