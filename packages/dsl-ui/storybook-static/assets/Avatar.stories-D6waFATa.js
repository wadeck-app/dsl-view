import{j as i}from"./jsx-runtime-D_zvdyIk.js";import{r as d}from"./iframe-C8SDnYAp.js";import{c as B}from"./index-BfZ2q5_f.js";import{u as G}from"./index-PHkyKt4e.js";import{u as D}from"./index-BYhyg5Ti.js";import{P as I}from"./index-twabaTmL.js";import"./preload-helper-Dp1pzeXC.js";import"./index-EVyiSfz9.js";import"./index-BZzt7Uss.js";var J=Object.defineProperty,m=(e,t)=>J(e,"name",{value:t,configurable:!0}),O="Avatar",[K,ue]=B(O),V=[0,()=>{}],[$,U]=K(O),Z=d.forwardRef(m(function(t,r){const{__scopeAvatar:o,...s}=t,[a,c]=d.useState("idle"),[l,n]=q();return i.jsx($,{scope:o,imageLoadingStatus:a,setImageLoadingStatus:c,imageCount:l,setImageCount:n,children:i.jsx(I.span,{...s,ref:r})})},"Avatar")),H="AvatarImage",Q=d.forwardRef(m(function(t,r){const{__scopeAvatar:o,src:s,onLoadingStatusChange:a,...c}=t,l=U(H,o);l.setImageCount;const n=W(s,{referrerPolicy:c.referrerPolicy,crossOrigin:c.crossOrigin,loadingStatus:l.imageLoadingStatus,setLoadingStatus:l.setImageLoadingStatus}),u=G(x=>{a==null||a(x)}),h=d.useRef(n);return D(()=>{const x=h.current;h.current=n,n!==x&&u(n)},[n,u]),n==="loaded"?i.jsx(I.img,{...c,ref:r,src:s}):null},"AvatarImage")),X="AvatarFallback",Y=d.forwardRef(m(function(t,r){const{__scopeAvatar:o,delayMs:s,...a}=t,c=U(X,o),[l,n]=d.useState(s===void 0);return d.useEffect(()=>{if(s!==void 0){const u=window.setTimeout(()=>n(!0),s);return()=>window.clearTimeout(u)}},[s]),l&&c.imageLoadingStatus!=="loaded"?i.jsx(I.span,{...a,ref:r}):null},"AvatarFallback"));function W(e,{loadingStatus:t,setLoadingStatus:r,referrerPolicy:o,crossOrigin:s}){return D(()=>{if(!e){r("error");return}const a=new window.Image,c=m(n=>{const u=n.currentTarget;r(b(u))},"handleLoad"),l=m(()=>r("error"),"handleError");return a.addEventListener("load",c),a.addEventListener("error",l),o&&(a.referrerPolicy=o),a.crossOrigin=s??null,a.src=e,r(b(a)),()=>{a.removeEventListener("load",c),a.removeEventListener("error",l),r("idle")}},[e,s,o,r]),t}m(W,"useImageLoadingStatus");function b(e){return e.complete?e.naturalWidth>0?"loaded":"error":"loading"}m(b,"getImageLoadingStatus");function q(){return V}m(q,"useImageCount");function ee(e){}m(ee,"useUpdateImageCount");const ae={sm:"w-6 h-6 text-xs",md:"w-8 h-8 text-sm",lg:"w-12 h-12 text-base"},re="w-full h-full flex items-center justify-center bg-primary text-white font-medium uppercase";function g({src:e,alt:t,fallback:r,size:o="md"}){return i.jsxs(Z,{className:`inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 ${ae[o]}`,children:[e&&i.jsx(Q,{src:e,alt:t,className:"w-full h-full object-cover"}),i.jsx(Y,{delayMs:e?600:0,className:re,children:r??(t?t.slice(0,2):"?")})]})}g.__docgenInfo={description:`@registryCategory atomic
@registryTags avatar user profile image`,methods:[],displayName:"Avatar",props:{src:{required:!1,tsType:{name:"string"},description:""},alt:{required:!1,tsType:{name:"string"},description:""},fallback:{required:!1,tsType:{name:"string"},description:""},size:{required:!1,tsType:{name:"union",raw:"'sm' | 'md' | 'lg'",elements:[{name:"literal",value:"'sm'"},{name:"literal",value:"'md'"},{name:"literal",value:"'lg'"}]},description:"",defaultValue:{value:"'md'",computed:!1}}}};const ge={title:"Display/Avatar",component:g,parameters:{layout:"centered"},argTypes:{size:{control:"radio",options:["sm","md","lg"]}}},p={args:{fallback:"JD",size:"md"}},f={args:{src:"https://i.pravatar.cc/150?img=3",alt:"User",size:"md"}},v={args:{fallback:"AB",size:"sm"}},A={args:{fallback:"CD",size:"lg"}},S={render:()=>i.jsxs("div",{className:"flex items-center gap-4",children:[i.jsx(g,{fallback:"SM",size:"sm"}),i.jsx(g,{fallback:"MD",size:"md"}),i.jsx(g,{fallback:"LG",size:"lg"})]})},pe=["WithFallback","WithImage","SmallSize","LargeSize","AllSizes"];var L,k,z;p.parameters={...p.parameters,docs:{...(L=p.parameters)==null?void 0:L.docs,source:{originalSource:`{
  args: {
    fallback: 'JD',
    size: 'md'
  }
}`,...(z=(k=p.parameters)==null?void 0:k.docs)==null?void 0:z.source}}};var C,_,y;f.parameters={...f.parameters,docs:{...(C=f.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    src: 'https://i.pravatar.cc/150?img=3',
    alt: 'User',
    size: 'md'
  }
}`,...(y=(_=f.parameters)==null?void 0:_.docs)==null?void 0:y.source}}};var E,w,j;v.parameters={...v.parameters,docs:{...(E=v.parameters)==null?void 0:E.docs,source:{originalSource:`{
  args: {
    fallback: 'AB',
    size: 'sm'
  }
}`,...(j=(w=v.parameters)==null?void 0:w.docs)==null?void 0:j.source}}};var T,M,N;A.parameters={...A.parameters,docs:{...(T=A.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    fallback: 'CD',
    size: 'lg'
  }
}`,...(N=(M=A.parameters)==null?void 0:M.docs)==null?void 0:N.source}}};var R,P,F;S.parameters={...S.parameters,docs:{...(R=S.parameters)==null?void 0:R.docs,source:{originalSource:`{
  render: () => <div className="flex items-center gap-4">\r
            <Avatar fallback="SM" size="sm" />\r
            <Avatar fallback="MD" size="md" />\r
            <Avatar fallback="LG" size="lg" />\r
        </div>
}`,...(F=(P=S.parameters)==null?void 0:P.docs)==null?void 0:F.source}}};export{S as AllSizes,A as LargeSize,v as SmallSize,p as WithFallback,f as WithImage,pe as __namedExportsOrder,ge as default};
