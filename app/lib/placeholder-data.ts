const users = [
    {
        id: '410544b2-4001-4271-9855-fec4b6a6442a',
        name: 'teddy',
        email: 'terp@next.com',
        password: '123456',
        date: "2025-10-12"
    }
]

const outfits = [
    {
        id: "d6e15727-9fe1-4961-8c5b-ea44a9bd81aa",
        user_id: '410544b2-4001-4271-9855-fec4b6a6442a',
        name: "teddy's first outfit",
        shirt_image_url: "https://th.bing.com/th/id/OIP.BXPav46zzCT_LQwvXBf4ywHaJf?w=130&h=180&c=7&r=0&o=7&cb=12&dpr=1.5&pid=1.7&rm=3",
        pants_image_url: "https://media.istockphoto.com/photos/blue-jeans-isolated-with-clipping-path-picture-id600373506?k=6&m=600373506&s=612x612&w=0&h=foM-oap8DrT2jbZBF1MBvv_25xkDKiPIWztH_1yqpnI=",
        shoes_image_url: "https://png.pngtree.com/png-clipart/20230417/original/pngtree-red-transparent-shoes-canvas-shoes-png-image_9062873.png",
        hat_accessory_image_url: "",
        glasses_accessory_image_url: "",
        ear_piercings_accessory_image_url: "",
        neck_accessory_image_url: "",
        wrist_accessory_image_url: "",
        pants_accessory_image_url: "",
        bag_accessory_image_url: "",
        rotation_status: "In rotation",
        personal_rating: 8,
        date: "2025-10-12"
    }
]

const ratings = [
    {
        user_id: "410544b2-4001-4271-9855-fec4b6a6442a",
        outfit_id: "d6e15727-9fe1-4961-8c5b-ea44a9bd81aa",
        date: "2025-10-10",
        rating: 5
    },    
    {
        user_id: "410544b2-4001-4271-9855-fec4b6a6442a",
        outfit_id: "d6e15727-9fe1-4961-8c5b-ea44a9bd81aa",
        date: "2025-10-11",
        rating: 6
    },
    {
        user_id: "410544b2-4001-4271-9855-fec4b6a6442a",
        outfit_id: "d6e15727-9fe1-4961-8c5b-ea44a9bd81aa",
        date: "2025-10-12",
        rating: 7
    }
]

export {users, outfits, ratings};