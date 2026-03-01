type K8sItem = Record<string, unknown>;

export class CoreV1Api {}
export class AppsV1Api {}

const createCoreV1ApiMock = () => ({
  listNamespace: async () => ({ items: [] as K8sItem[] }),
  listNamespacedConfigMap: async () => ({ items: [] as K8sItem[] }),
  listNamespacedSecret: async () => ({ items: [] as K8sItem[] }),
});

const createAppsV1ApiMock = () => ({
  listNamespacedDeployment: async () => ({ items: [] as K8sItem[] }),
  listNamespacedDaemonSet: async () => ({ items: [] as K8sItem[] }),
  listNamespacedStatefulSet: async () => ({ items: [] as K8sItem[] }),
  readNamespacedDeployment: async () => ({ spec: {} }),
  replaceNamespacedDeployment: async () => ({}),
  readNamespacedDaemonSet: async () => ({ spec: {} }),
  replaceNamespacedDaemonSet: async () => ({}),
  readNamespacedStatefulSet: async () => ({ spec: {} }),
  replaceNamespacedStatefulSet: async () => ({}),
});

export class KubeConfig {
  loadFromString(kubeconfig: string): void {
    if (
      !kubeconfig ||
      !kubeconfig.includes('apiVersion:') ||
      !kubeconfig.includes('clusters:')
    ) {
      throw new Error('Invalid kubeconfig');
    }
  }

  makeApiClient(apiClientType: unknown): any {
    if (apiClientType === CoreV1Api) {
      return createCoreV1ApiMock();
    }

    if (apiClientType === AppsV1Api) {
      return createAppsV1ApiMock();
    }

    return {};
  }
}
