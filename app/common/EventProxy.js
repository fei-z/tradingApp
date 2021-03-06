// https://github.com/jser-club/vue-event-proxy
// this.$on('global:EVENT_NAME');
// this.$once('global:EVENT_NAME');
// this.$emit('global:EVENT_NAME');

function plugin(Vue) {
    const NOOP = () => { };

    plugin.installed = true

    const eventMap = {};
    const vmEventMap = {};
    const globalRE = /^global:/

    function mixinEvents(Vue) {
        const on = Vue.prototype.$on;
        Vue.prototype.$on = function proxyOn(eventName, fn = NOOP) {
            const vm = this;
            if (Array.isArray(eventName)) {
                eventName.forEach((item) => {
                    vm.$on(item, fn)
                });
            } else {
                if (globalRE.test(eventName)) {
                    (vmEventMap[vm._uid] || (vmEventMap[vm._uid] = [])).push(eventName);
                    (eventMap[eventName] || (eventMap[eventName] = [])).push(vm);
                }
                on.call(vm, eventName, fn);
            }
            return vm;
        };

        const emit = Vue.prototype.$emit;
        Vue.prototype.$emit = function proxyEmit(eventName, ...args) {
            const vm = this;
            if (globalRE.test(eventName)) {
                const vmList = eventMap[eventName] || [];
                vmList.forEach(item => emit.apply(item, [eventName, ...args]));
            } else {
                emit.apply(vm, [eventName, ...args]);
            }
            return vm;
        }
    }

    function applyMixin(Vue) {
        Vue.mixin({
            beforeDestroy() {
                const vm = this;
                const events = vmEventMap[vm._uid] || [];
                events.forEach((event) => {
                    const targetIdx = eventMap[event].findIndex(item => item._uid === vm._uid);
                    eventMap[event].splice(targetIdx, 1);
                });
                delete vmEventMap[vm._uid];
                Object.entries(eventMap).forEach(
                    ([eventName, vmList]) => vmList.length || delete eventMap[eventName]
                );
            },
        });
    }

    mixinEvents(Vue);
    applyMixin(Vue);
}

export default plugin;