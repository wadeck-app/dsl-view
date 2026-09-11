import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as o}from"./iframe-C8SDnYAp.js";import{u as V,c as F}from"./index-BeWwO2i_.js";import{c as $}from"./index-BfZ2q5_f.js";import{u as B}from"./index-BYhyg5Ti.js";import{P as R,u as W}from"./index-twabaTmL.js";import{u as J,P as K}from"./index-CoN7dpiG.js";import{c as Q}from"./createLucideIcon-DaIa_YUY.js";import"./preload-helper-Dp1pzeXC.js";import"./index-EVyiSfz9.js";import"./index-BZzt7Uss.js";/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],X=Q("chevron-down",U);var Y=Object.defineProperty,u=(r,t)=>Y(r,"name",{value:t,configurable:!0}),j="Collapsible",[Z,Re]=$(j),[ee,_]=Z(j),te=o.forwardRef(u(function(t,s){const{__scopeCollapsible:l,open:i,defaultOpen:n,disabled:d,onOpenChange:c,...x}=t,[m,p]=V({prop:i,defaultProp:n??!1,onChange:c,caller:j});return e.jsx(ee,{scope:l,disabled:d,contentId:J(),open:m,onOpenToggle:o.useCallback(()=>p(v=>!v),[p]),children:e.jsx(R.div,{"data-state":h(m),"data-disabled":d?"":void 0,...x,ref:s})})},"Collapsible")),ne="CollapsibleTrigger",oe=o.forwardRef(u(function(t,s){const{__scopeCollapsible:l,...i}=t,n=_(ne,l);return e.jsx(R.button,{type:"button","aria-controls":n.open?n.contentId:void 0,"aria-expanded":n.open||!1,"data-state":h(n.open),"data-disabled":n.disabled?"":void 0,disabled:n.disabled,...i,ref:s,onClick:F(t.onClick,n.onOpenToggle)})},"CollapsibleTrigger")),G="CollapsibleContent",re=o.forwardRef(u(function(t,s){const{forceMount:l,...i}=t,n=_(G,t.__scopeCollapsible);return e.jsx(K,{present:l||n.open,children:({present:d})=>e.jsx(ae,{...i,ref:s,present:d})})},"CollapsibleContent")),ae=o.forwardRef(u(function(t,s){const{__scopeCollapsible:l,present:i,children:n,...d}=t,c=_(G,l),[x,m]=o.useState(i),p=o.useRef(null),v=W(s,p),S=o.useRef(0),N=S.current,w=o.useRef(0),I=w.current,y=c.open||x,O=o.useRef(y),f=o.useRef(void 0);return o.useEffect(()=>{const a=requestAnimationFrame(()=>O.current=!1);return()=>cancelAnimationFrame(a)},[]),B(()=>{const a=p.current;if(a){f.current=f.current||{transitionDuration:a.style.transitionDuration,animationName:a.style.animationName},a.style.transitionDuration="0s",a.style.animationName="none";const P=a.getBoundingClientRect();S.current=P.height,w.current=P.width,O.current||(a.style.transitionDuration=f.current.transitionDuration,a.style.animationName=f.current.animationName),m(i)}},[c.open,i]),e.jsx(R.div,{"data-state":h(c.open),"data-disabled":c.disabled?"":void 0,id:c.contentId,hidden:!y,...d,ref:v,style:{"--radix-collapsible-content-height":N?`${N}px`:void 0,"--radix-collapsible-content-width":I?`${I}px`:void 0,...t.style},children:y&&n})},"CollapsibleContentImpl"));function h(r){return r?"open":"closed"}u(h,"getState");var se=te,ie=oe,le=re;const ce="flex items-center justify-between w-full py-2 px-3 text-sm font-medium text-content hover:bg-muted-bg rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-solid)] focus:ring-inset",de="h-4 w-4 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180";function H({title:r,defaultOpen:t=!1,children:s}){return e.jsxs(se,{defaultOpen:t,className:"group w-full",children:[e.jsxs(ie,{className:ce,children:[e.jsx("span",{children:r}),e.jsx(X,{className:de,"aria-hidden":"true"})]}),e.jsx(le,{className:"overflow-hidden data-[state=open]:animate-none",children:e.jsx("div",{className:"px-3 py-2",children:s})})]})}H.__docgenInfo={description:`@registryCategory disposition
@registryTags collapsible accordion expandable`,methods:[],displayName:"Collapsible",props:{title:{required:!0,tsType:{name:"string"},description:""},defaultOpen:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},children:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:"@slot tag:field, tag:layout, tag:atomic"}}};const je={title:"Layout/Collapsible",component:H,parameters:{layout:"padded"},decorators:[r=>e.jsx("div",{style:{width:320},children:e.jsx(r,{})})]},g={args:{title:"Advanced settings",children:e.jsx("p",{style:{margin:0,fontSize:14},children:"Hidden until expanded."})}},C={args:{title:"Advanced settings",defaultOpen:!0,children:e.jsx("p",{style:{margin:0,fontSize:14},children:"Visible by default."})}},b={args:{title:"More details",defaultOpen:!0,children:e.jsxs("ul",{style:{margin:0,paddingLeft:16,fontSize:14},children:[e.jsx("li",{children:"Item one"}),e.jsx("li",{children:"Item two"}),e.jsx("li",{children:"Item three"})]})}},_e=["DefaultClosed","DefaultOpen","WithContent"];var T,A,E;g.parameters={...g.parameters,docs:{...(T=g.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    title: 'Advanced settings',
    children: <p style={{
      margin: 0,
      fontSize: 14
    }}>Hidden until expanded.</p>
  }
}`,...(E=(A=g.parameters)==null?void 0:A.docs)==null?void 0:E.source}}};var D,L,M;C.parameters={...C.parameters,docs:{...(D=C.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    title: 'Advanced settings',
    defaultOpen: true,
    children: <p style={{
      margin: 0,
      fontSize: 14
    }}>Visible by default.</p>
  }
}`,...(M=(L=C.parameters)==null?void 0:L.docs)==null?void 0:M.source}}};var z,q,k;b.parameters={...b.parameters,docs:{...(z=b.parameters)==null?void 0:z.docs,source:{originalSource:`{
  args: {
    title: 'More details',
    defaultOpen: true,
    children: <ul style={{
      margin: 0,
      paddingLeft: 16,
      fontSize: 14
    }}>\r
                <li>Item one</li>\r
                <li>Item two</li>\r
                <li>Item three</li>\r
            </ul>
  }
}`,...(k=(q=b.parameters)==null?void 0:q.docs)==null?void 0:k.source}}};export{g as DefaultClosed,C as DefaultOpen,b as WithContent,_e as __namedExportsOrder,je as default};
