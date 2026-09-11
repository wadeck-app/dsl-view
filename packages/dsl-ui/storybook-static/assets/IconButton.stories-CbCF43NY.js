import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{c as m}from"./createLucideIcon-DaIa_YUY.js";import"./iframe-C8SDnYAp.js";import"./preload-helper-Dp1pzeXC.js";/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]],L=m("loader-circle",z);/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P=[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]],f=m("pencil",P);/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $=[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],H=m("settings",$);/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z=[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]],G=m("trash-2",Z),O="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs rounded bg-[#111827] px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-normal text-center",Y="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#111827]";function A({content:a,children:t}){return e.jsxs("span",{className:"relative inline-flex group",children:[t,e.jsxs("span",{role:"tooltip",className:O,children:[a,e.jsx("span",{className:Y})]})]})}A.__docgenInfo={description:`@registryCategory disposition
@registryTags tooltip
@uiexception hover-only - Tooltips are intentionally hover-triggered; they cannot be permanently visible without defeating their purpose (screen real estate and visual noise). This is the sole accepted exception to UX §6.`,methods:[],displayName:"Tooltip",props:{content:{required:!0,tsType:{name:"string"},description:""},children:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:"@slot tag:atomic, tag:composite"}}};const U="inline-flex items-center justify-center rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",X={primary:"bg-[var(--color-primary-solid)] text-white hover:bg-[var(--color-primary-solid-hover)] focus:ring-[var(--color-primary-solid)]",secondary:"border border-border bg-surface text-content hover:bg-bg-secondary focus:ring-border",danger:"bg-danger text-white hover:bg-danger/80 focus:ring-danger","danger-outline":"border border-danger text-danger hover:bg-danger-bg focus:ring-danger",neutral:"bg-muted-bg text-content hover:bg-bg-secondary focus:ring-border",success:"bg-success text-white hover:bg-success/80 focus:ring-success",ghost:"text-muted hover:bg-muted-bg hover:text-content focus:ring-border",link:"text-primary hover:underline focus:ring-primary px-0 py-0 font-mono"},F={sm:"px-3 py-1 text-xs gap-1.5",md:"px-4 py-2 text-sm gap-2"},J={default:"",stack:"flex-col gap-2"};function D({variant:a="primary",size:t="md",shape:s="default",className:r="",disabled:p,disabledReason:n,loading:o=!1,children:g,...M}){const y=p||o,h=s==="stack",b=e.jsxs("button",{...M,disabled:y,className:[U,!h&&X[a],!h&&F[t],J[s],r].filter(Boolean).join(" "),children:[o&&e.jsx(L,{className:"h-4 w-4 animate-spin","aria-hidden":"true"}),g]});return y&&n?e.jsx(A,{content:n,children:b}):b}D.__docgenInfo={description:"",methods:[],displayName:"Button",props:{variant:{required:!1,tsType:{name:"union",raw:"'primary' | 'secondary' | 'danger' | 'danger-outline' | 'neutral' | 'success' | 'ghost' | 'link'",elements:[{name:"literal",value:"'primary'"},{name:"literal",value:"'secondary'"},{name:"literal",value:"'danger'"},{name:"literal",value:"'danger-outline'"},{name:"literal",value:"'neutral'"},{name:"literal",value:"'success'"},{name:"literal",value:"'ghost'"},{name:"literal",value:"'link'"}]},description:"",defaultValue:{value:"'primary'",computed:!1}},size:{required:!1,tsType:{name:"union",raw:"'sm' | 'md'",elements:[{name:"literal",value:"'sm'"},{name:"literal",value:"'md'"}]},description:"",defaultValue:{value:"'md'",computed:!1}},shape:{required:!1,tsType:{name:"union",raw:"'default' | 'stack'",elements:[{name:"literal",value:"'default'"},{name:"literal",value:"'stack'"}]},description:"'stack' arranges children in a column (icon above label) instead of a row - used by option-picker style buttons.",defaultValue:{value:"'default'",computed:!1}},disabledReason:{required:!1,tsType:{name:"string"},description:""},loading:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},className:{defaultValue:{value:"''",computed:!1},required:!1}},composes:["ButtonHTMLAttributes"]};const K={sm:"!w-6 !h-6 !p-0 flex items-center justify-center",md:"!w-8 !h-8 !p-0 flex items-center justify-center"},Q={sm:"h-3.5 w-3.5",md:"h-4 w-4"};function B({icon:a,label:t,variant:s="secondary",size:r="md",onClick:p,disabled:n,disabledReason:o,loading:g=!1}){return e.jsx(D,{variant:s,size:r,onClick:p,disabled:n,disabledReason:o,loading:!1,"aria-label":t,className:K[r],children:g?e.jsx(L,{className:`${Q[r]} animate-spin`,"aria-hidden":"true"}):a})}B.__docgenInfo={description:`@registryCategory atomic
@registryTags button icon action`,methods:[],displayName:"IconButton",props:{icon:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},label:{required:!0,tsType:{name:"string"},description:""},variant:{required:!1,tsType:{name:"union",raw:"'primary' | 'secondary' | 'danger' | 'ghost'",elements:[{name:"literal",value:"'primary'"},{name:"literal",value:"'secondary'"},{name:"literal",value:"'danger'"},{name:"literal",value:"'ghost'"}]},description:"",defaultValue:{value:"'secondary'",computed:!1}},size:{required:!1,tsType:{name:"union",raw:"'sm' | 'md'",elements:[{name:"literal",value:"'sm'"},{name:"literal",value:"'md'"}]},description:"",defaultValue:{value:"'md'",computed:!1}},onClick:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},disabled:{required:!1,tsType:{name:"boolean"},description:""},disabledReason:{required:!1,tsType:{name:"string"},description:""},loading:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};const re={title:"Controls/IconButton",component:B,parameters:{layout:"centered"}},i={args:{icon:e.jsx(f,{className:"h-4 w-4"}),label:"Edit",variant:"secondary"}},l={args:{icon:e.jsx(G,{className:"h-4 w-4"}),label:"Delete",variant:"danger"}},c={args:{icon:e.jsx(H,{className:"h-4 w-4"}),label:"Settings",variant:"ghost"}},d={args:{icon:e.jsx(f,{className:"h-4 w-4"}),label:"Edit",disabled:!0,disabledReason:"You do not have permission"}},u={args:{icon:e.jsx(f,{className:"h-4 w-4"}),label:"Saving",loading:!0}},se=["Default","Danger","Ghost","Disabled","Loading"];var v,x,w;i.parameters={...i.parameters,docs:{...(v=i.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    icon: <Pencil className="h-4 w-4" />,
    label: 'Edit',
    variant: 'secondary'
  }
}`,...(w=(x=i.parameters)==null?void 0:x.docs)==null?void 0:w.source}}};var N,S,T;l.parameters={...l.parameters,docs:{...(N=l.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    icon: <Trash2 className="h-4 w-4" />,
    label: 'Delete',
    variant: 'danger'
  }
}`,...(T=(S=l.parameters)==null?void 0:S.docs)==null?void 0:T.source}}};var k,_,j;c.parameters={...c.parameters,docs:{...(k=c.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    icon: <Settings className="h-4 w-4" />,
    label: 'Settings',
    variant: 'ghost'
  }
}`,...(j=(_=c.parameters)==null?void 0:_.docs)==null?void 0:j.source}}};var q,E,R;d.parameters={...d.parameters,docs:{...(q=d.parameters)==null?void 0:q.docs,source:{originalSource:`{
  args: {
    icon: <Pencil className="h-4 w-4" />,
    label: 'Edit',
    disabled: true,
    disabledReason: 'You do not have permission'
  }
}`,...(R=(E=d.parameters)==null?void 0:E.docs)==null?void 0:R.source}}};var V,C,I;u.parameters={...u.parameters,docs:{...(V=u.parameters)==null?void 0:V.docs,source:{originalSource:`{
  args: {
    icon: <Pencil className="h-4 w-4" />,
    label: 'Saving',
    loading: true
  }
}`,...(I=(C=u.parameters)==null?void 0:C.docs)==null?void 0:I.source}}};export{l as Danger,i as Default,d as Disabled,c as Ghost,u as Loading,se as __namedExportsOrder,re as default};
