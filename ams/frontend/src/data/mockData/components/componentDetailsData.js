export const getComponentDetails = (component) => {
  if (!component) {
    return {
      breadcrumbRoot: "Components",
      breadcrumbCurrent: "Component Details",
      breadcrumbRootPath: "/components",
      title: "Component Not Found",
      subtitle: "",
    };
  }

  return {
    breadcrumbRoot: "Components",
    breadcrumbCurrent: component.name,
    breadcrumbRootPath: "/components",
    title: component.name,
    subtitle: component.model_number || "",
  };
};

export const getComponentTabs = () => {
  return [
    { label: "About" },
    { label: "Active Checkouts" },
    { label: "History" }
  ];
};

