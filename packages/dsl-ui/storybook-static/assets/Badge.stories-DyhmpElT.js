import{j as a}from"./jsx-runtime-D_zvdyIk.js";const q={default:"bg-surface border border-border text-content",primary:"bg-primary text-white",success:"bg-success text-white",warning:"bg-warning-bg text-warning-text border border-warning-text/20",danger:"bg-danger text-white",info:"bg-info-bg text-info-text"},C={sm:"px-2 py-0.5 text-xs",md:"px-2.5 py-1 text-sm"};function e({label:V,variant:M="default",size:W="sm"}){return a.jsx("span",{className:`inline-flex items-center rounded-full font-medium ${q[M]} ${C[W]}`,children:V})}e.__docgenInfo={description:`@registryCategory atomic
@registryTags badge status`,methods:[],displayName:"Badge",props:{label:{required:!0,tsType:{name:"string"},description:""},variant:{required:!1,tsType:{name:"union",raw:"'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'",elements:[{name:"literal",value:"'default'"},{name:"literal",value:"'primary'"},{name:"literal",value:"'success'"},{name:"literal",value:"'warning'"},{name:"literal",value:"'danger'"},{name:"literal",value:"'info'"}]},description:"",defaultValue:{value:"'default'",computed:!1}},size:{required:!1,tsType:{name:"union",raw:"'sm' | 'md'",elements:[{name:"literal",value:"'sm'"},{name:"literal",value:"'md'"}]},description:"",defaultValue:{value:"'sm'",computed:!1}}}};const R={title:"Display/Badge",component:e,parameters:{layout:"centered"},argTypes:{variant:{control:"select",options:["default","primary","success","warning","danger","info"]},size:{control:"radio",options:["sm","md"]}}},r={args:{label:"Default",variant:"default"}},n={args:{label:"Primary",variant:"primary"}},s={args:{label:"Active",variant:"success"}},t={args:{label:"Pending",variant:"warning"}},i={args:{label:"Error",variant:"danger"}},l={args:{label:"Info",variant:"info"}},o={args:{label:"Medium",variant:"primary",size:"md"}},c={render:()=>a.jsxs("div",{className:"flex flex-wrap gap-2",children:[a.jsx(e,{label:"Default",variant:"default"}),a.jsx(e,{label:"Primary",variant:"primary"}),a.jsx(e,{label:"Success",variant:"success"}),a.jsx(e,{label:"Warning",variant:"warning"}),a.jsx(e,{label:"Danger",variant:"danger"}),a.jsx(e,{label:"Info",variant:"info"})]})},$=["Default","Primary","Success","Warning","Danger","Info","SizeMd","AllVariants"];var d,m,u;r.parameters={...r.parameters,docs:{...(d=r.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    label: 'Default',
    variant: 'default'
  }
}`,...(u=(m=r.parameters)==null?void 0:m.docs)==null?void 0:u.source}}};var g,p,f;n.parameters={...n.parameters,docs:{...(g=n.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    label: 'Primary',
    variant: 'primary'
  }
}`,...(f=(p=n.parameters)==null?void 0:p.docs)==null?void 0:f.source}}};var v,b,x;s.parameters={...s.parameters,docs:{...(v=s.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    label: 'Active',
    variant: 'success'
  }
}`,...(x=(b=s.parameters)==null?void 0:b.docs)==null?void 0:x.source}}};var y,S,w;t.parameters={...t.parameters,docs:{...(y=t.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    label: 'Pending',
    variant: 'warning'
  }
}`,...(w=(S=t.parameters)==null?void 0:S.docs)==null?void 0:w.source}}};var D,j,B;i.parameters={...i.parameters,docs:{...(D=i.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    label: 'Error',
    variant: 'danger'
  }
}`,...(B=(j=i.parameters)==null?void 0:j.docs)==null?void 0:B.source}}};var I,A,P;l.parameters={...l.parameters,docs:{...(I=l.parameters)==null?void 0:I.docs,source:{originalSource:`{
  args: {
    label: 'Info',
    variant: 'info'
  }
}`,...(P=(A=l.parameters)==null?void 0:A.docs)==null?void 0:P.source}}};var E,h,z;o.parameters={...o.parameters,docs:{...(E=o.parameters)==null?void 0:E.docs,source:{originalSource:`{
  args: {
    label: 'Medium',
    variant: 'primary',
    size: 'md'
  }
}`,...(z=(h=o.parameters)==null?void 0:h.docs)==null?void 0:z.source}}};var T,_,N;c.parameters={...c.parameters,docs:{...(T=c.parameters)==null?void 0:T.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-2">\r
            <Badge label="Default" variant="default" />\r
            <Badge label="Primary" variant="primary" />\r
            <Badge label="Success" variant="success" />\r
            <Badge label="Warning" variant="warning" />\r
            <Badge label="Danger" variant="danger" />\r
            <Badge label="Info" variant="info" />\r
        </div>
}`,...(N=(_=c.parameters)==null?void 0:_.docs)==null?void 0:N.source}}};export{c as AllVariants,i as Danger,r as Default,l as Info,n as Primary,o as SizeMd,s as Success,t as Warning,$ as __namedExportsOrder,R as default};
