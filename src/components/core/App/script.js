import macro from '@kitware/vtk.js/macro';
import Mousetrap from 'mousetrap';
import { VBottomSheet, VDialog } from 'vuetify/lib';
import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';

import AboutBox from 'paraview-glance/src/components/core/AboutBox';
import BrowserIssues from 'paraview-glance/src/components/core/BrowserIssues';
import ControlsDrawer from 'paraview-glance/src/components/core/ControlsDrawer';
import ErrorBox from 'paraview-glance/src/components/core/ErrorBox';
import FileLoader from 'paraview-glance/src/components/core/FileLoader';
import Landing from 'paraview-glance/src/components/core/Landing';
import LayoutView from 'paraview-glance/src/components/core/LayoutView';
import CollapsibleToolbar from 'paraview-glance/src/components/widgets/CollapsibleToolbar';
import CollapsibleToolbarItem from 'paraview-glance/src/components/widgets/CollapsibleToolbar/Item';
import DragAndDrop from 'paraview-glance/src/components/widgets/DragAndDrop';
import SvgIcon from 'paraview-glance/src/components/widgets/SvgIcon';

import shortcuts from 'paraview-glance/src/shortcuts';

// ----------------------------------------------------------------------------
// Component API
// ----------------------------------------------------------------------------

export default {
  name: 'App',
  components: {
    AboutBox,
    BrowserIssues,
    CollapsibleToolbar,
    CollapsibleToolbarItem,
    ControlsDrawer,
    DragAndDrop,
    ErrorBox,
    FileLoader,
    Landing,
    LayoutView,
    SvgIcon,
    VBottomSheet,
    VDialog,
  },
  provide() {
    return {
      $notify: this.notify,
    };
  },
  data() {
    return {
      aboutDialog: false,
      errorDialog: false,
      fileUploadDialog: false,
      autoloadDialog: false,
      autoloadLabel: '',
      internalControlsDrawer: true,
      screenshotCount: 0,
      errors: [],
      globalSingleNotification: '',
      notifyPermanent: false,
    };
  },
  computed: {
    controlsDrawer: {
      get() {
        return this.landingVisible ? false : this.internalControlsDrawer;
      },
      set(visible) {
        if (!this.landingVisible) {
          this.internalControlsDrawer = visible;
        }
      },
    },
    ...mapState({
      loadingState: 'loadingState',
      landingVisible: (state) => state.route === 'landing',
      smallScreen() {
        return this.$vuetify.breakpoint.smAndDown;
      },
      dialogType() {
        return this.smallScreen ? 'v-bottom-sheet' : 'v-dialog';
      },
    }),
    ...mapGetters('files', {
      anyFileLoadingErrors: 'anyErrors',
      fileLoadingProgress: 'totalProgress',
    }),
  },
  proxyManagerHooks: {
    onProxyModified() {
      if (!this.loadingState) {
        this.$proxyManager.autoAnimateViews();
      }
    },
  },
  created() {
    this.internalControlsDrawer = !this.smallScreen;
  },
  mounted() {
    this.$root.$on('open_girder_panel', () => {
      this.fileUploadDialog = true;
    });
    this.initViews();
    this.initializeAnimations();

    // attach keyboard shortcuts
    shortcuts.forEach(({ key, action }) =>
      Mousetrap.bind(key, (e) => {
        e.preventDefault();
        this.$store.dispatch(action);
      })
    );

    // listen for errors
    window.addEventListener('error', this.recordError);

    // listen for vtkErrorMacro
    macro.setLoggerFunction('error', (...args) => {
      this.recordError(args.join(' '));
      window.console.error(...args);
    });
  },
  beforeDestroy() {
    window.removeEventListener('error', this.recordError);
    shortcuts.forEach(({ key }) => Mousetrap.unbind(key));
  },
  methods: {
    ...mapMutations({
      showApp: 'showApp',
      showLanding: 'showLanding',
      // 导航栏app和landing的切换
      toggleLanding() {
        console.log('toggleLanding');
        if (this.landingVisible) {
          this.showApp();
        } else {
          this.showLanding();
        }
      },
    }),
    ...mapActions({
      initViews: 'views/initViews',
    }),
    ...mapActions('files', [
      'openFiles',
      'openRemoteFiles',
      'load',
      'resetQueue',
    ]),
    ...mapActions('animations', ['initializeAnimations']),
    showFileUpload() {
      this.fileUploadDialog = true;
    },
    openFileList(fileList) {
      this.fileUploadDialog = true;
      this.$nextTick(() => this.openFiles(Array.from(fileList)));
    },
    autoLoadRemotes(label, urls, names) {
      const remotes = urls.map((url, index) => ({
        name: names[index],
        url,
      }));
      this.autoloadDialog = true;
      this.autoloadLabel = label;
      setTimeout(
        () =>
          this.openRemoteFiles(remotes)
            .then(() => this.load())
            .then(() => {
              if (this.anyFileLoadingErrors) {
                this.$nextTick(() => {
                  this.fileUploadDialog = true;
                });
              } else {
                this.doneLoadingFiles();
              }
            })
            .finally(() => {
              this.resetQueue();
              this.autoloadDialog = false;
            }),
        // hack to allow loading sample dialog to show up
        10
      );
    },
    doneLoadingFiles() {
      this.showApp();
    },
    recordError(error) {
      this.errors.push(error);
    },
    notify(msg, permanent = false) {
      if (this.globalSingleNotification) {
        this.globalSingleNotification = '';
        this.permanent = false;
      }
      this.$nextTick(() => {
        this.globalSingleNotification = msg;
        this.notifyPermanent = permanent;
      });
    },
  },
};
