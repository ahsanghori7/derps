import { useContext, useEffect, useRef } from 'react';
import { UNSAFE_NavigationContext as NavigationContext, useLocation, useNavigate } from 'react-router-dom';

const isModifiedClick = (event) =>
    event.metaKey || event.altKey || event.ctrlKey || event.shiftKey || event.button !== 0;

export const useNavigationBlocker = (when, onBlock) => {
    const { navigator } = useContext(NavigationContext);
    const navigate = useNavigate();
    const location = useLocation();
    const onBlockRef = useRef(onBlock);
    onBlockRef.current = onBlock;
    const whenRef = useRef(when);
    whenRef.current = when;

    useEffect(() => {
        if (!when) return undefined;

        const originalPush = navigator.push;
        const originalReplace = navigator.replace;
        const originalGo = navigator.go;

        const intercept = (retry) => {
            if (!whenRef.current) {
                retry();
                return;
            }

            onBlockRef.current({
                retry,
                reset: () => {},
            });
        };

        navigator.push = (...args) => intercept(() => originalPush.apply(navigator, args));
        navigator.replace = (...args) => intercept(() => originalReplace.apply(navigator, args));
        navigator.go = (...args) => intercept(() => originalGo.apply(navigator, args));

        const handleDocumentClick = (event) => {
            if (!whenRef.current || isModifiedClick(event)) return;

            const anchor = event.target.closest('a[href]');
            if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

            const href = anchor.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

            let url;
            try {
                url = new URL(href, window.location.origin);
            } catch {
                return;
            }

            if (url.origin !== window.location.origin) return;

            const nextPath = `${url.pathname}${url.search}${url.hash}`;
            const currentPath = `${location.pathname}${location.search}${location.hash}`;
            if (nextPath === currentPath) return;

            event.preventDefault();
            event.stopPropagation();

            intercept(() => {
                navigate(nextPath);
            });
        };

        document.addEventListener('click', handleDocumentClick, true);

        return () => {
            navigator.push = originalPush;
            navigator.replace = originalReplace;
            navigator.go = originalGo;
            document.removeEventListener('click', handleDocumentClick, true);
        };
    }, [navigator, when, navigate, location.pathname, location.search, location.hash]);
};
