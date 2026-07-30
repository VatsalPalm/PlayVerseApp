import { StyleProp, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import useStyleArgs from '../../hooks'
import { StyleArgs } from '../../utils/types'
import CImage from './CImage'
import { ImageStyle, Source } from 'react-native-fast-image';
import { Icons } from '../../assets'



interface CHeaderProps {
    image: number | Source | undefined
    imageStyle?: StyleProp<ImageStyle>
}

const CHeader = (props: CHeaderProps) => {
    const styles = useStyleArgs(styleHandler)
    return (
        <View style={styles.container}>
            <CImage source={props?.image ? props?.image : Icons.crmLogo} style={[props?.imageStyle ? props?.imageStyle : styles.imageStyle]} resizeMode='contain' />
        </View>
    )
}

export default CHeader

const styleHandler = ({ dims, insets, theme: { colors } }: StyleArgs) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            top: insets.top
        },
        imageStyle: {
            width: dims.width * 0.32,
            height: dims.width * 0.13,
        }
    })