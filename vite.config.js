export default {
    base: './',
    build: {
        target: 'esnext',
        rollupOptions: {
            output: {
                entryFileNames: `assets/[name].js`,
            },
        },
    },
};
