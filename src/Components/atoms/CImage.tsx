import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import React, { useState } from 'react';
import FastImage, { FastImageProps } from 'react-native-fast-image';

interface CustomImageProps extends FastImageProps {
    showLoader?: boolean;
}
const CImage = (props: CustomImageProps) => {
    const [loading, setLoading] = useState(false);
    return (
        <FastImage
            {...props}
            style={[styles.container, props.style]}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}>
            {loading && props.showLoader && <ActivityIndicator />}
        </FastImage>
    );
};

export default CImage;

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
});
