# Kubeconfig Setup Guide

This guide explains how to generate and configure kubeconfig files for connecting generic Kubernetes clusters (EKS, GKE, AKS, or vanilla Kubernetes) to Rancher Hub.

## What is a Kubeconfig?

A kubeconfig file is a YAML file that contains cluster connection information, authentication credentials, and context settings. It allows Kubernetes clients to connect to and authenticate with Kubernetes clusters.

## Kubeconfig Structure

A typical kubeconfig file has the following structure:

```yaml
apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://your-cluster-endpoint:443
    certificate-authority-data: <base64-encoded-ca-cert>
  name: cluster-name
contexts:
- context:
    cluster: cluster-name
    user: user-name
  name: context-name
current-context: context-name
users:
- name: user-name
  user:
    token: <your-token>
    # OR
    client-certificate-data: <base64-encoded-cert>
    client-key-data: <base64-encoded-key>
```

## Generating Kubeconfig for Different Platforms

### Amazon EKS (Elastic Kubernetes Service)

#### Using AWS CLI

1. **Install AWS CLI** (if not already installed):
   ```bash
   # macOS
   brew install awscli
   
   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   ```

2. **Configure AWS credentials**:
   ```bash
   aws configure
   ```
   Enter your AWS Access Key ID, Secret Access Key, region, and output format.

3. **Install kubectl** (if not already installed):
   ```bash
   # macOS
   brew install kubectl
   
   # Linux
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   chmod +x kubectl
   sudo mv kubectl /usr/local/bin/
   ```

4. **Install eksctl** (recommended):
   ```bash
   # macOS
   brew install eksctl
   
   # Linux
   curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
   sudo mv /tmp/eksctl /usr/local/bin
   ```

5. **Generate kubeconfig**:
   ```bash
   # Method 1: Using eksctl (recommended)
   eksctl utils write-kubeconfig --cluster=your-cluster-name --region=us-west-2
   
   # Method 2: Using AWS CLI
   aws eks update-kubeconfig --name your-cluster-name --region us-west-2
   ```

6. **Verify connection**:
   ```bash
   kubectl get nodes
   ```

7. **Get kubeconfig content**:
   ```bash
   cat ~/.kube/config
   ```
   Copy the entire content to use in Rancher Hub.

#### Using AWS Console

1. Navigate to EKS → Clusters → Your Cluster
2. Click "Connect" tab
3. Follow the instructions to configure `kubectl`
4. Copy the generated kubeconfig content

### Google GKE (Google Kubernetes Engine)

#### Using gcloud CLI

1. **Install Google Cloud SDK**:
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Linux
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   ```

2. **Authenticate**:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Install kubectl**:
   ```bash
   gcloud components install kubectl
   ```

4. **Generate kubeconfig**:
   ```bash
   gcloud container clusters get-credentials CLUSTER_NAME --zone ZONE --project PROJECT_ID
   ```

5. **Get kubeconfig content**:
   ```bash
   cat ~/.kube/config
   ```

#### Using GKE Console

1. Navigate to Kubernetes Engine → Clusters
2. Click on your cluster
3. Click "Connect" button
4. Copy the `gcloud` command and run it
5. Copy the kubeconfig content from `~/.kube/config`

### Azure AKS (Azure Kubernetes Service)

#### Using Azure CLI

1. **Install Azure CLI**:
   ```bash
   # macOS
   brew install azure-cli
   
   # Linux
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

2. **Login**:
   ```bash
   az login
   ```

3. **Set subscription**:
   ```bash
   az account set --subscription SUBSCRIPTION_ID
   ```

4. **Install kubectl**:
   ```bash
   az aks install-cli
   ```

5. **Generate kubeconfig**:
   ```bash
   az aks get-credentials --resource-group RESOURCE_GROUP --name CLUSTER_NAME
   ```

6. **Get kubeconfig content**:
   ```bash
   cat ~/.kube/config
   ```

#### Using Azure Portal

1. Navigate to Kubernetes services → Your AKS cluster
2. Click "Connect" in the overview
3. Copy the `az aks get-credentials` command
4. Run the command in your terminal
5. Copy the kubeconfig content

### Vanilla Kubernetes (On-Premises or Self-Managed)

#### Using kubectl

1. **Get kubeconfig from cluster administrator**:
   - Ask your cluster administrator for the kubeconfig file
   - They should provide a file with cluster endpoint, CA certificate, and user credentials

2. **Or generate from existing cluster**:
   ```bash
   # If you have access to the cluster
   kubectl config view --flatten > kubeconfig.yaml
   ```

3. **Verify the kubeconfig**:
   ```bash
   kubectl --kubeconfig=kubeconfig.yaml get nodes
   ```

#### Manual Creation

If you have cluster details, you can create a kubeconfig manually:

```yaml
apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://your-cluster-endpoint:6443
    certificate-authority-data: LS0tLS1CRUdJTi... # Base64 encoded CA cert
  name: my-cluster
contexts:
- context:
    cluster: my-cluster
    user: my-user
  name: my-context
current-context: my-context
users:
- name: my-user
  user:
    token: eyJhbGciOiJSUzI1NiIs... # Your bearer token
```

## Service Account Token (Recommended for Long-Lived Access)

For production use, it's recommended to use service account tokens instead of user tokens:

### Creating a Service Account

1. **Create service account**:
   ```bash
   kubectl create serviceaccount rancher-hub-sa -n default
   ```

2. **Create cluster role binding** (adjust permissions as needed):
   ```bash
   kubectl create clusterrolebinding rancher-hub-binding \
     --clusterrole=cluster-admin \
     --serviceaccount=default:rancher-hub-sa
   ```

3. **Get service account token**:
   ```bash
   # Kubernetes 1.24+
   kubectl create token rancher-hub-sa -n default
   
   # Older versions
   SECRET=$(kubectl get serviceaccount rancher-hub-sa -o jsonpath='{.secrets[0].name}')
   kubectl get secret $SECRET -o jsonpath='{.data.token}' | base64 -d
   ```

4. **Update kubeconfig**:
   Replace the `token` field in your kubeconfig with the service account token.

## Kubeconfig Validation

Before uploading to Rancher Hub, validate your kubeconfig:

```bash
# Test connection
kubectl --kubeconfig=your-kubeconfig.yaml get nodes

# Validate YAML format
kubectl --kubeconfig=your-kubeconfig.yaml config view
```

## Security Best Practices

1. **Use Service Accounts**: Prefer service account tokens over user credentials
2. **Limit Permissions**: Grant only necessary RBAC permissions
3. **Rotate Tokens**: Regularly rotate service account tokens
4. **Secure Storage**: Store kubeconfig files securely
5. **Use Separate Contexts**: Use different contexts for different environments
6. **Monitor Access**: Regularly audit who has access to kubeconfig files

## Troubleshooting

### Common Issues

1. **"Invalid kubeconfig format"**:
   - Ensure the file is valid YAML
   - Check that all required fields are present
   - Verify indentation is correct

2. **"Kubeconfig must have a current-context"**:
   - Set `current-context` field in your kubeconfig
   - Or use: `kubectl config use-context CONTEXT_NAME`

3. **"Connection failed"**:
   - Verify cluster endpoint is accessible
   - Check network connectivity
   - Ensure token/certificate is valid and not expired
   - Verify RBAC permissions

4. **"Certificate validation failed"**:
   - Ensure `certificate-authority-data` is correct
   - For self-signed certs, you may need to add `insecure-skip-tls-verify: true` (not recommended for production)

### Testing Connection

```bash
# Test with kubectl
kubectl --kubeconfig=your-kubeconfig.yaml get namespaces

# Test API server access
kubectl --kubeconfig=your-kubeconfig.yaml cluster-info
```

## File Size Limits

- Maximum kubeconfig file size: **1MB**
- Rancher Hub validates kubeconfig before accepting it
- Large certificates may increase file size - consider using certificate files instead of inline data

## Multi-Context Kubeconfigs

If your kubeconfig contains multiple contexts:

- Rancher Hub uses the `current-context` by default
- Each GenericClusterSite represents one cluster
- For multiple clusters, create separate GenericClusterSite entries with context-specific kubeconfigs

## Next Steps

After generating your kubeconfig:

1. Copy the kubeconfig content
2. Navigate to Rancher Hub → Generic Clusters
3. Click "Add Cluster Site"
4. Paste the kubeconfig content
5. The system will validate and test the connection automatically

For more information, see the [Multi-Cluster Implementation Guide](../MULTI_CLUSTER_IMPLEMENTATION.md).

