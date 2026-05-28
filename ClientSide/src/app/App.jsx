import { Suspense, lazy } from 'react';
import { BrowserRouter as Router } from "react-router-dom";
import { QueryClientProvider } from '@tanstack/react-query';
import AppRouter from "@router/AppRouter";
import { AuthProvider } from "@app/providers/auth/AuthProvider";
import { NotificationProvider } from "@app/providers/notification/NotificationProvider";
import { ExportProvider } from "@app/providers/export/ExportProvider";
import { ChartCompareProvider } from "@components/ui/ChartCompareContext";
import { queryClient } from '@lib/queryClient';
import { ConfigProvider, App as AntApp } from 'antd';
import { LayoutProvider } from '@/components/navigation/sidemenu/useSideMenuLayout';
import FloatingExportStatus from '@/features/enterprises/components/ExportHelper/FloatingExportStatus';
import GlobalSocketListener from '@/components/GlobalSocketListener';

const ReactQueryDevtoolsLazy = import.meta.env.DEV
    ? lazy(() =>
        import('@tanstack/react-query-devtools').then((module) => ({
            default: module.ReactQueryDevtools,
        }))
    )
    : null;

function App() {
    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#4E5BA6',
                },
            }}
        >
            <AntApp>
                <QueryClientProvider client={queryClient}>
                    <GlobalSocketListener />
                    <LayoutProvider>
                        <NotificationProvider>
                            <Router>
                                <AuthProvider>
                                    <ExportProvider>
                                        <ChartCompareProvider>
                                            <AppRouter />
                                            <FloatingExportStatus />
                                        </ChartCompareProvider>
                                    </ExportProvider>
                                </AuthProvider>
                            </Router>
                        </NotificationProvider>
                    </LayoutProvider>

                    {ReactQueryDevtoolsLazy && (
                        <Suspense fallback={null}>
                            <ReactQueryDevtoolsLazy initialIsOpen={false} />
                        </Suspense>
                    )}
                </QueryClientProvider>
            </AntApp>
        </ConfigProvider >
    );
}

export default App;
