import{j as s}from"./jsx-runtime-D_zvdyIk.js";import{c as S}from"./createLucideIcon-DaIa_YUY.js";import"./iframe-C8SDnYAp.js";import"./preload-helper-Dp1pzeXC.js";/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D=[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]],_=S("external-link",D),q={default:"text-primary hover:underline",muted:"text-muted hover:text-content",danger:"text-danger hover:underline"};function v({href:y,label:b,external:n=!1,variant:k="default"}){return s.jsxs("a",{href:y,className:`inline-flex items-center text-sm transition-colors ${q[k]}`,...n?{target:"_blank",rel:"noopener noreferrer"}:{},children:[b,n&&s.jsx(_,{className:"ml-0.5 h-3 w-3 inline","aria-hidden":"true"})]})}v.__docgenInfo={description:`@registryCategory atomic
@registryTags link anchor navigation`,methods:[],displayName:"Link",props:{href:{required:!0,tsType:{name:"string"},description:""},label:{required:!0,tsType:{name:"string"},description:""},external:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},variant:{required:!1,tsType:{name:"union",raw:"'default' | 'muted' | 'danger'",elements:[{name:"literal",value:"'default'"},{name:"literal",value:"'muted'"},{name:"literal",value:"'danger'"}]},description:"",defaultValue:{value:"'default'",computed:!1}}}};const V={title:"Navigation/Link",component:v,parameters:{layout:"centered"}},e={args:{href:"/dashboard",label:"Dashboard"}},a={args:{href:"https://example.com",label:"Visit site",external:!0}},r={args:{href:"/secondary",label:"Secondary link",variant:"muted"}},t={args:{href:"/delete",label:"Delete account",variant:"danger"}},M=["Default","External","Muted","Danger"];var o,l,i;e.parameters={...e.parameters,docs:{...(o=e.parameters)==null?void 0:o.docs,source:{originalSource:`{
  args: {
    href: '/dashboard',
    label: 'Dashboard'
  }
}`,...(i=(l=e.parameters)==null?void 0:l.docs)==null?void 0:i.source}}};var d,c,u;a.parameters={...a.parameters,docs:{...(d=a.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    href: 'https://example.com',
    label: 'Visit site',
    external: true
  }
}`,...(u=(c=a.parameters)==null?void 0:c.docs)==null?void 0:u.source}}};var m,p,f;r.parameters={...r.parameters,docs:{...(m=r.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    href: '/secondary',
    label: 'Secondary link',
    variant: 'muted'
  }
}`,...(f=(p=r.parameters)==null?void 0:p.docs)==null?void 0:f.source}}};var g,h,x;t.parameters={...t.parameters,docs:{...(g=t.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    href: '/delete',
    label: 'Delete account',
    variant: 'danger'
  }
}`,...(x=(h=t.parameters)==null?void 0:h.docs)==null?void 0:x.source}}};export{t as Danger,e as Default,a as External,r as Muted,M as __namedExportsOrder,V as default};
